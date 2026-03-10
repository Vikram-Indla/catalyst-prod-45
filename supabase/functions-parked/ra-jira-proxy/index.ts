import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { action, payload } = await req.json()

    // STEP A — Read Jira credentials from platform storage
    let jiraUrl = '', jiraEmail = '', jiraToken = ''

    // Try ph_jira_connection first (primary platform table)
    const { data: phConn } = await supabase
      .from('ph_jira_connection')
      .select('*')
      .eq('status', 'connected')
      .limit(1)
      .single()

    if (phConn) {
      jiraUrl = (phConn.site_url || '').replace(/\/$/, '')
      jiraEmail = phConn.auth_email || ''
      jiraToken = phConn.auth_token_encrypted || ''
    }

    // Fallback: jira_connections + jira_auth_credentials
    if (!jiraUrl || !jiraEmail || !jiraToken) {
      const { data: jiraConn } = await supabase
        .from('jira_connections')
        .select('id, jira_url, is_active')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (jiraConn) {
        const { data: creds } = await supabase
          .from('jira_auth_credentials')
          .select('auth_data')
          .eq('connection_id', jiraConn.id)
          .single()

        if (creds?.auth_data) {
          const ad = creds.auth_data as any
          jiraUrl = (jiraConn.jira_url || '').replace(/\/$/, '')
          jiraEmail = ad.email || ad.username || ''
          jiraToken = ad.api_token || ad.token || ad.password || ''
        }
      }
    }

    if (!jiraUrl || !jiraEmail || !jiraToken) {
      return json({ error: 'JIRA_NOT_CONFIGURED', message: 'Jira credentials not found in platform settings.' }, 422)
    }

    // STEP B — Build auth header
    const authHeader = 'Basic ' + btoa(`${jiraEmail}:${jiraToken}`)
    const jiraHeaders = { 'Authorization': authHeader, 'Accept': 'application/json' }

    // STEP C — verify_project
    if (action === 'verify_project') {
      const { projectKey } = payload
      const res = await fetch(`${jiraUrl}/rest/api/3/project/${encodeURIComponent(projectKey)}`, { headers: jiraHeaders })
      if (res.status === 404) {
        await res.text()
        return json({ error: 'PROJECT_NOT_FOUND', message: 'Project not found in Jira.' }, 404)
      }
      if (!res.ok) {
        const t = await res.text()
        return json({ error: 'JIRA_ERROR', message: t }, res.status)
      }
      const proj = await res.json()
      return json({
        project_key: proj.key,
        project_name: proj.name,
        avatar_url: proj.avatarUrls?.['48x48'] || null,
      })
    }

    // STEP D — sync_tickets
    if (action === 'sync_tickets') {
      const { projectKey } = payload
      const jql = `project = ${projectKey} AND attachments is not EMPTY ORDER BY created DESC`
      const url = `${jiraUrl}/rest/api/3/search/jql`

      const res = await fetch(url, {
        method: 'POST',
        headers: { ...jiraHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jql,
          maxResults: 100,
          fields: ['summary', 'status', 'priority', 'attachment', 'issuetype', 'created', 'parent'],
        }),
      })
      if (!res.ok) {
        const t = await res.text()
        console.error(`Jira search failed for ${projectKey}: ${res.status} ${t}`)
        return json({ error: 'JIRA_SEARCH_FAILED', message: t }, res.status)
      }

      const data = await res.json()
      const issues = data.issues || []
      const now = new Date().toISOString()

      // Get project name
      let projectName = projectKey
      try {
        const pRes = await fetch(`${jiraUrl}/rest/api/3/project/${encodeURIComponent(projectKey)}`, { headers: jiraHeaders })
        if (pRes.ok) {
          const pData = await pRes.json()
          projectName = pData.name || projectKey
        } else {
          await pRes.text()
        }
      } catch { /* non-fatal */ }

      const tickets = issues.map((issue: any) => {
        const f = issue.fields || {}
        const attachments = f.attachment || []
        const hasPdf = attachments.some((a: any) =>
          a.mimeType === 'application/pdf' || (a.filename || '').toLowerCase().endsWith('.pdf')
        )
        return {
          ticket_key: issue.key,
          project_key: projectKey,
          project_name: projectName,
          jira_issue_id: issue.id,
          ticket_summary: f.summary || 'Untitled',
          priority: (f.priority?.name || 'Medium').toUpperCase(),
          status: f.status?.name || 'Open',
          attachment_count: attachments.length,
          has_pdf: hasPdf,
          synced_at: now,
        }
      })

      if (tickets.length > 0) {
        // Delete existing tickets for this project then insert fresh
        await supabase.from('ra_jira_tickets').delete().eq('project_key', projectKey)
        const { error } = await supabase.from('ra_jira_tickets').insert(tickets)
        if (error) console.error('Insert error:', error)
      }

      // Update ra_jira_connections
      await supabase
        .from('ra_jira_connections')
        .update({ ticket_count: tickets.length, last_synced_at: now, updated_at: now, project_name: projectName })
        .eq('project_key', projectKey)

      return json({ synced: tickets.length, tickets })
    }

    // ── STEP E — import_single: Full single-ticket import with PDF + parent ──
    if (action === 'import_single') {
      const { issueKey, brdId } = payload
      if (!issueKey) return json({ error: 'MISSING_ISSUE_KEY' }, 400)

      // E1: Fetch issue with extended fields
      const issueRes = await fetch(
        `${jiraUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,description,attachment,parent,issuetype,status,priority`,
        { headers: jiraHeaders }
      )
      if (!issueRes.ok) {
        const t = await issueRes.text()
        return json({ error: 'JIRA_FETCH_FAILED', message: t }, issueRes.status)
      }
      const issue = await issueRes.json()
      const fields = issue.fields || {}

      // E2: Extract parent + ticket type
      const parentKey = fields.parent?.key || null
      const ticketType = (fields.issuetype?.name || 'Story').toLowerCase()
        .replace('sub-task', 'subtask')
        .replace('sub_task', 'subtask')

      // E3: Find BRD PDF in attachments
      const attachments: any[] = fields.attachment || []
      const brdPdfs = attachments.filter((a: any) => {
        if (a.mimeType !== 'application/pdf' && !(a.filename || '').toLowerCase().endsWith('.pdf')) return false
        const fn = (a.filename || '').toLowerCase()
        return fn.includes('brd') || fn.includes('متطلبات') || fn.includes('وثيقة') || a.mimeType === 'application/pdf'
      })
      // Sort by size descending — largest is likely the full BRD
      brdPdfs.sort((a: any, b: any) => (b.size || 0) - (a.size || 0))
      const pdfAttachment = brdPdfs[0] || null

      // Determine the target brd_id
      let targetBrdId = brdId
      if (!targetBrdId) {
        const { data: existing } = await supabase
          .from('brd_documents')
          .select('id')
          .eq('jira_key', issueKey)
          .maybeSingle()
        targetBrdId = existing?.id
      }

      if (!targetBrdId) {
        return json({ error: 'BRD_NOT_FOUND', message: `No brd_documents row for ${issueKey}` }, 404)
      }

      let rawText: string | null = null
      let rawTextSource = 'description'
      let pdfFilename: string | null = null
      let pdfStoragePath: string | null = null

      // E4: Download + upload PDF if found
      if (pdfAttachment) {
        try {
          const pdfRes = await fetch(pdfAttachment.content, { headers: jiraHeaders })
          if (pdfRes.ok) {
            const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer())
            pdfFilename = pdfAttachment.filename || 'source.pdf'
            const storagePath = `${targetBrdId}/source.pdf`

            // Upload to Supabase Storage
            const { error: uploadErr } = await supabase.storage
              .from('brd-attachments')
              .upload(storagePath, pdfBytes, {
                contentType: 'application/pdf',
                upsert: true,
              })

            if (!uploadErr) {
              pdfStoragePath = storagePath

              // E5: Extract text from PDF using simple text layer extraction
              try {
                rawText = extractTextFromPdf(pdfBytes)
                if (rawText && rawText.trim().length > 50) {
                  rawTextSource = 'pdf_extracted'
                } else {
                  rawText = null // Too short, fall through
                }
              } catch (exErr) {
                console.error('PDF text extraction error:', exErr)
              }
            } else {
              console.error('PDF upload error:', uploadErr)
            }
          } else {
            await pdfRes.text()
            console.error('PDF download failed:', pdfRes.status)
          }
        } catch (pdfErr) {
          console.error('PDF processing error:', pdfErr)
        }
      }

      // E6: Fallback chain for raw_text
      if (!rawText) {
        // Try description (Jira v3 ADF → plain text)
        const desc = fields.description
        if (desc) {
          rawText = typeof desc === 'string' ? desc : extractAdfText(desc)
          rawTextSource = 'description'
        }
      }
      if (!rawText || rawText.trim().length < 10) {
        rawText = fields.summary || issueKey
        rawTextSource = 'title_only'
      }

      // E7: Update brd_documents
      const updatePayload: Record<string, any> = {
        parent_jira_key: parentKey,
        ticket_type: ticketType,
        raw_text: rawText,
        raw_text_source: rawTextSource,
        updated_at: new Date().toISOString(),
      }
      if (pdfStoragePath) {
        updatePayload.pdf_url = pdfStoragePath
        updatePayload.pdf_filename = pdfFilename
        updatePayload.pdf_attached_at = new Date().toISOString()
      }

      const { error: updateErr } = await supabase
        .from('brd_documents')
        .update(updatePayload)
        .eq('id', targetBrdId)

      if (updateErr) {
        console.error('brd_documents update error:', updateErr)
        return json({ error: 'UPDATE_FAILED', message: updateErr.message }, 500)
      }

      // Log activity
      await supabase.from('ra_activity_log').insert({
        brd_id: targetBrdId,
        event_type: 'reimport',
        message: `Re-imported ${issueKey} from Jira (source: ${rawTextSource}${pdfStoragePath ? ', PDF attached' : ''})`,
      }).then(() => {})

      return json({
        success: true,
        brd_id: targetBrdId,
        parent_jira_key: parentKey,
        ticket_type: ticketType,
        raw_text_source: rawTextSource,
        pdf_attached: !!pdfStoragePath,
        raw_text_length: rawText?.length || 0,
      })
    }

    return json({ error: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` }, 400)

  } catch (err: any) {
    console.error('ra-jira-proxy error:', err)
    return json({ error: err.message }, 500)
  }
})

// ── Helper: Extract plain text from Jira ADF (Atlassian Document Format) ──
function extractAdfText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text') return node.text || ''
  if (Array.isArray(node.content)) {
    return node.content.map(extractAdfText).join(node.type === 'paragraph' ? '\n' : ' ')
  }
  return ''
}

// ── Helper: Simple PDF text extraction from raw bytes ──
// Extracts text from PDF stream objects — handles most text-layer PDFs
function extractTextFromPdf(bytes: Uint8Array): string {
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const raw = decoder.decode(bytes)

  const textChunks: string[] = []

  // Method 1: Extract text between BT...ET blocks (PDF text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g
  let match
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1]
    // Extract parenthesized strings: (text)
    const parenRegex = /\(([^)]*)\)/g
    let pm
    while ((pm = parenRegex.exec(block)) !== null) {
      const decoded = pm[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\\\/g, '\\')
        .replace(/\\([()])/g, '$1')
      if (decoded.trim()) textChunks.push(decoded)
    }
    // Extract hex strings: <hex>
    const hexRegex = /<([0-9A-Fa-f\s]+)>/g
    let hm
    while ((hm = hexRegex.exec(block)) !== null) {
      const hex = hm[1].replace(/\s/g, '')
      let str = ''
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16))
      }
      if (str.trim()) textChunks.push(str)
    }
  }

  // Method 2: If BT/ET found nothing, try stream-based extraction
  if (textChunks.length === 0) {
    const streamRegex = /stream\r?\n([\s\S]*?)endstream/g
    while ((match = streamRegex.exec(raw)) !== null) {
      const content = match[1]
      // Only take printable content
      const printable = content.replace(/[^\x20-\x7E\n\r\t\u0600-\u06FF\u0750-\u077F]/g, ' ')
        .replace(/\s{3,}/g, ' ')
        .trim()
      if (printable.length > 20) textChunks.push(printable)
    }
  }

  return textChunks.join(' ').replace(/\s+/g, ' ').trim()
}
