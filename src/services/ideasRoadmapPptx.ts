const loadPptxGenJS = () => import('pptxgenjs').then(m => m.default);
import type { RoadmapIdea } from '@/types/ideasRoadmap';

const Q_COLORS: Record<string, string> = {
  Q1: '7C3AED', Q2: '2563EB', Q3: '0D9488', Q4: 'D97706',
};

function dayOfYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (d.getFullYear() < 2026) return 1;
  if (d.getFullYear() > 2026) return 365;
  const start = new Date(2026, 0, 1);
  return Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
}

const MON_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return MON_NAMES[d.getMonth()] + ' ' + d.getDate();
}

const Q_CFG = [
  { key: 'Q1', months: ['Jan','Feb','Mar'], starts: [1,32,60],   ends: [31,59,90]  },
  { key: 'Q2', months: ['Apr','May','Jun'], starts: [91,121,152], ends: [120,151,181] },
  { key: 'Q3', months: ['Jul','Aug','Sep'], starts: [182,213,244], ends: [212,243,273] },
  { key: 'Q4', months: ['Oct','Nov','Dec'], starts: [274,305,335], ends: [304,334,365] },
];

export async function exportRoadmapPptx(ideas: RoadmapIdea[]): Promise<void> {
  const committed = ideas.filter(i => i.isCommitted);

  const PptxGenJS = await loadPptxGenJS();
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // ── COVER SLIDE ──
  const cover = pptx.addSlide();
  cover.background = { color: 'FFFFFF' };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 5.5, h: 7.5, fill: { color: '1A1A1A' } });
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: 7.5, fill: { color: '0D9488' } });

  cover.addText('MINISTRY OF INDUSTRY & MINERAL RESOURCES', {
    x: 0.4, y: 1.2, w: 5.0, h: 0.3, fontSize: 8, bold: true, color: 'A1A1A1', charSpacing: 2,
  });
  cover.addText('MIM Digital\nTransformation', {
    x: 0.4, y: 1.7, w: 5.0, h: 1.4, fontSize: 32, bold: true, color: '0F172A', lineSpacingMultiple: 1.1,
  });
  cover.addText('Roadmap', {
    x: 0.4, y: 3.0, w: 5.0, h: 0.8, fontSize: 32, bold: true, color: '0D9488',
  });
  cover.addShape(pptx.ShapeType.rect, { x: 0.4, y: 3.85, w: 0.5, h: 0.06, fill: { color: '0D9488' } });
  cover.addText('Annual ideas pipeline committed to delivery\nacross Senaei Platform — FY 2026', {
    x: 0.4, y: 4.0, w: 5.0, h: 0.7, fontSize: 11, color: '475569', lineSpacingMultiple: 1.4,
  });

  // Stats
  cover.addShape(pptx.ShapeType.rect, { x: 0.4, y: 4.9, w: 2.2, h: 0.9, fill: { color: 'FFFFFF' }, line: { color: '3A3A3A', width: 1 } });
  cover.addText('COMMITTED', { x: 0.4, y: 4.95, w: 2.2, h: 0.2, fontSize: 7, bold: true, color: 'A1A1A1', align: 'center', charSpacing: 1.5 });
  cover.addText(String(committed.length), { x: 0.4, y: 5.15, w: 2.2, h: 0.5, fontSize: 28, bold: true, color: '0F172A', align: 'center' });

  cover.addShape(pptx.ShapeType.rect, { x: 2.8, y: 4.9, w: 2.2, h: 0.9, fill: { color: 'FFFFFF' }, line: { color: '3A3A3A', width: 1 } });
  cover.addText('FISCAL YEAR', { x: 2.8, y: 4.95, w: 2.2, h: 0.2, fontSize: 7, bold: true, color: 'A1A1A1', align: 'center', charSpacing: 1.5 });
  cover.addText('2026', { x: 2.8, y: 5.15, w: 2.2, h: 0.5, fontSize: 28, bold: true, color: '0F172A', align: 'center' });

  // Q breakdown on right
  const QCOLS = ['Q1','Q2','Q3','Q4'];
  const QCOLORS = ['7C3AED','2563EB','0D9488','D97706'];
  const QLABELS = ['Jan–Mar','Apr–Jun','Jul–Sep','Oct–Dec'];
  QCOLS.forEach((q, i) => {
    const count = committed.filter(idea => idea.quarter === q).length;
    const x = 6.0 + i * 1.8;
    cover.addShape(pptx.ShapeType.rect, { x, y: 2.0, w: 1.6, h: 0.05, fill: { color: QCOLORS[i] } });
    cover.addShape(pptx.ShapeType.rect, { x, y: 2.05, w: 1.6, h: 2.0, fill: { color: 'FFFFFF' }, line: { color: '3A3A3A', width: 1 } });
    cover.addText(q, { x, y: 2.1, w: 1.6, h: 0.3, fontSize: 9, bold: true, color: '64748B', align: 'center' });
    cover.addText(String(count), { x, y: 2.45, w: 1.6, h: 0.8, fontSize: 30, bold: true, color: QCOLORS[i], align: 'center' });
    cover.addText(QLABELS[i], { x, y: 3.3, w: 1.6, h: 0.25, fontSize: 8, color: 'A1A1A1', align: 'center' });
  });

  cover.addText(`Prepared by Delivery Management · Catalyst Platform · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, {
    x: 0.4, y: 7.1, w: 12.5, h: 0.25, fontSize: 8, color: 'A1A1A1',
  });

  // ── QUARTER SLIDES ──
  for (const qCfg of Q_CFG) {
    const qIdeas = committed.filter(i => i.quarter === qCfg.key).slice(0, 20);
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    const qColor = Q_COLORS[qCfg.key];
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.5, fill: { color: 'FAFBFC' } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.5, w: 13.33, h: 0.04, fill: { color: '0D9488' } });
    slide.addText('MIM', { x: 0.2, y: 0.1, w: 0.5, h: 0.3, fontSize: 9, bold: true, color: 'FFFFFF', fill: { color: '0D2242' }, align: 'center' });
    slide.addText(`${qCfg.key} 2026  —  ${qCfg.months.join(' · ')}`, {
      x: 0.85, y: 0.1, w: 8, h: 0.3, fontSize: 11, bold: true, color: '1E293B',
    });
    slide.addText(`${qIdeas.length} committed ideas`, {
      x: 11.5, y: 0.1, w: 1.6, h: 0.3, fontSize: 9, color: 'A1A1A1', align: 'right',
    });

    if (qIdeas.length === 0) {
      slide.addText(`No committed ideas in ${qCfg.key} 2026`, {
        x: 2, y: 3.5, w: 9, h: 0.5, fontSize: 14, color: 'A1A1A1', align: 'center',
      });
      continue;
    }

    const LABEL_X = 0.15, LABEL_W = 2.5;
    const TL_X = 2.8, TL_W = 10.3;
    const monthW = TL_W / 3;

    slide.addText('IDEA', { x: LABEL_X, y: 0.6, w: LABEL_W, h: 0.25, fontSize: 7, bold: true, color: '64748B', charSpacing: 1 });
    qCfg.months.forEach((m, mi) => {
      const x = TL_X + mi * monthW;
      slide.addShape(pptx.ShapeType.rect, { x, y: 0.6, w: monthW, h: 0.25, fill: { color: '1A1A1A' } });
      slide.addText(m.toUpperCase(), { x, y: 0.6, w: monthW, h: 0.25, fontSize: 7, bold: true, color: '64748B', align: 'center', charSpacing: 1 });
    });

    qCfg.months.forEach((_, mi) => {
      if (mi > 0) {
        const x = TL_X + mi * monthW;
        slide.addShape(pptx.ShapeType.line, { x, y: 0.6, w: 0, h: 7.5 - 0.6, line: { color: '1A1A1A', width: 0.5 } });
      }
    });

    const [qStart, qEnd] = [qCfg.starts[0], qCfg.ends[2]];
    const qDays = qEnd - qStart + 1;

    function xPos(day: number): number {
      const mi = Math.floor((day - qStart) / (qDays / 3));
      const clampedMi = Math.max(0, Math.min(2, mi));
      const mStart = qCfg.starts[clampedMi];
      const mEnd = qCfg.ends[clampedMi];
      const mDays = mEnd - mStart + 1;
      const frac = (day - mStart) / mDays;
      return TL_X + clampedMi * monthW + frac * monthW;
    }

    const ROW_H = 0.30;
    const ROWS_START_Y = 0.9;

    qIdeas.forEach((idea, ri) => {
      const y = ROWS_START_Y + ri * ROW_H;
      if (y + ROW_H > 7.4) return;

      if (ri % 2 === 1) {
        slide.addShape(pptx.ShapeType.rect, { x: 0, y, w: 13.33, h: ROW_H, fill: { color: '1A1A1A' } });
      }

      const title = idea.title.length > 38 ? idea.title.substring(0, 36) + '…' : idea.title;
      slide.addText(idea.ideaKey, { x: LABEL_X, y: y + 0.01, w: LABEL_W, h: 0.13, fontSize: 6.5, color: 'A1A1A1', fontFace: 'Courier New' });
      slide.addText(title, { x: LABEL_X, y: y + 0.13, w: LABEL_W, h: 0.15, fontSize: 8, bold: true, color: '1E293B' });

      const ms = idea.milestones;
      const reqD = dayOfYear(ms.req ?? ms.des);
      const devD = dayOfYear(ms.dev);
      const prodD = dayOfYear(ms.prod);
      const barY = y + ROW_H * 0.35;
      const barH = ROW_H * 0.28;

      if (reqD && devD) {
        const cs = Math.max(reqD, qStart), ce = Math.min(devD, qEnd);
        if (cs <= ce) {
          slide.addShape(pptx.ShapeType.rect, {
            x: xPos(cs), y: barY, w: Math.max(0.02, xPos(ce) - xPos(cs)), h: barH,
            fill: { color: '334155' },
          });
        }
      }
      if (devD && prodD) {
        const cs = Math.max(devD, qStart), ce = Math.min(prodD, qEnd);
        if (cs <= ce) {
          slide.addShape(pptx.ShapeType.rect, {
            x: xPos(cs), y: barY, w: Math.max(0.02, xPos(ce) - xPos(cs)), h: barH,
            fill: { color: 'A1A1A1' },
          } as any);
        }
      }

      if (devD && devD >= qStart && devD <= qEnd) {
        const dx = xPos(devD);
        const ds = barH * 0.7;
        slide.addShape(pptx.ShapeType.rect, {
          x: dx - ds/2, y: barY - ds/4, w: ds, h: ds,
          fill: { color: qColor }, rotate: 45,
        });
        if (ms.dev) slide.addText(fmtDate(ms.dev), {
          x: dx - 0.3, y: barY - 0.14, w: 0.6, h: 0.13,
          fontSize: 5.5, bold: true, color: qColor, align: 'center', fontFace: 'Courier New',
        });
      }
      if (prodD && prodD >= qStart && prodD <= qEnd) {
        const px = xPos(prodD);
        const ds = barH * 0.7;
        slide.addShape(pptx.ShapeType.rect, {
          x: px - ds/2, y: barY - ds/4, w: ds, h: ds,
          fill: { color: '0D9488' }, rotate: 45,
        });
        if (ms.prod) slide.addText(fmtDate(ms.prod), {
          x: px - 0.3, y: barY + barH + 0.01, w: 0.6, h: 0.13,
          fontSize: 5.5, bold: true, color: '0D9488', align: 'center', fontFace: 'Courier New',
        });
      }
    });

    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.3, w: 13.33, h: 0.2, fill: { color: '1A1A1A' } });
    slide.addText('Ministry of Industry & Mineral Resources — Confidential', {
      x: 0.2, y: 7.32, w: 8, h: 0.16, fontSize: 7, color: 'A1A1A1',
    });
    slide.addText(`${qCfg.key} 2026  ·  ${qIdeas.length} ideas`, {
      x: 10, y: 7.32, w: 3.1, h: 0.16, fontSize: 7, color: 'A1A1A1', align: 'right',
    });
  }

  await pptx.writeFile({ fileName: `MIM_Ideas_Roadmap_FY2026_${new Date().toISOString().slice(0,10)}.pptx` });
}
