/**
 * SelectCoverPanel — Jira-parity "Select a cover" popover.
 *
 *  Two tabs (Colors + Upload — no Unsplash) with a shared header ("Select a
 *  cover" + close) and shared footer ("Remove cover"). This is the UI shell
 *  only; wiring to ph_issues.cover / storage upload lands in a follow-up.
 *
 *  All colors and inline styles use ADS tokens where an equivalent exists.
 *  The solid + dark + gradient palettes below are UI presets (no ADS token
 *  parallel) and are annotated to bypass the color scanner.
 */
import React, { useState } from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import ImageIcon from '@atlaskit/icon/glyph/image';
import DeleteIcon from '@atlaskit/icon/core/delete';
import Spinner from '@atlaskit/spinner';
import { useCoverGallery, type WorkItemTable, type CoverImage } from '../data/useCoverGallery';

/** Build the CSS background string a Card / CoverStrap consumes from a
 *  public image URL — the same shape SelectCoverPanel emits on swatch
 *  clicks, so downstream renderers don't need to distinguish between
 *  solid, gradient, or image sources. */
export function imageCoverValue(url: string): string {
  return `url("${url}") center/cover no-repeat`;
}

/** Extract the raw url("...") portion out of a cover string so gallery
 *  thumbnails can highlight which image is currently active. */
function coverToUrl(cover: string | null | undefined): string | null {
  if (!cover) return null;
  const m = cover.match(/url\("?([^")]+)"?\)/);
  return m ? m[1] : null;
}

type SwatchDef = { name: string; background: string };

const COLOR_HUES = ['Grey', 'Blue', 'Cyan', 'Green', 'Lime', 'Yellow', 'Orange', 'Red', 'Pink', 'Purple'];

/* ads-scanner:ignore-next-line — cover palette hex list (UI presets, no ADS equivalent) */
const SOLID_LIGHT_HEXES: string[] = [
  '#E5E5E5', '#DBE4FF', '#DDF4FF', '#D9F5EB', '#E5F5D5', '#F7F0B5', '#F9E9D2', '#FBD9D0', '#F8D2DE', '#EED8F5',
];
/* ads-scanner:ignore-next-line — cover palette hex list (UI presets, no ADS equivalent) */
const SOLID_MEDIUM_HEXES: string[] = [
  '#C5C5C5', '#A9BEF7', '#B4E5F5', '#A1E4CB', '#B7DE99', '#EDD86A', '#F5C58C', '#F5A697', '#F2A6BA', '#DDB2F0',
];
/* ads-scanner:ignore-next-line — cover palette hex list (UI presets, no ADS equivalent) */
const SOLID_DARK_HEXES: string[] = [
  '#7A7A7A', '#5B87E8', '#54B6E0', '#3EAE83', '#8EBE47', '#E0BC00', '#E29431', '#DD4B39', '#DF4384', '#A64FD3',
];
/* ads-scanner:ignore-next-line — cover palette hex list (UI presets, no ADS equivalent) */
const SOLID_DARKER_HEXES: string[] = [
  '#4A4A4A', '#2C5FCB', '#1D7FAE', '#137056', '#5C7A22', '#946000', '#8F4A00', '#8B1E10', '#7A1F4E', '#5F1A99',
];

const SOLID_ROWS: SwatchDef[][] = [
  SOLID_LIGHT_HEXES.map((hex, i)  => ({ name: `Subtle ${COLOR_HUES[i].toLowerCase()}`, background: hex })),
  SOLID_MEDIUM_HEXES.map((hex, i) => ({ name: `Light ${COLOR_HUES[i].toLowerCase()}`,  background: hex })),
  SOLID_DARK_HEXES.map((hex, i)   => ({ name: `${COLOR_HUES[i]}`,                       background: hex })),
  SOLID_DARKER_HEXES.map((hex, i) => ({ name: `Bold ${COLOR_HUES[i].toLowerCase()}`,   background: hex })),
];

/* ads-scanner:ignore-next-line — cover gradient list (UI presets, no ADS equivalent) */
const GRADIENT_HEX_PAIRS: Array<[string, string]> = [
  ['#4A4A4A', '#262626'],
  ['#2C5FCB', '#133F91'],
  ['#1D7FAE', '#0B4B6D'],
  ['#137056', '#08402B'],
  ['#5C7A22', '#33470E'],
  ['#946000', '#522C00'],
  ['#8F4A00', '#4E1F00'],
  ['#8B1E10', '#4A0800'],
  ['#7A1F4E', '#3D0F26'],
  ['#5F1A99', '#2E0855'],
];
const GRADIENTS: SwatchDef[] = GRADIENT_HEX_PAIRS.map(([from, to], i) => ({
  name: `${COLOR_HUES[i]} gradient`,
  background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
}));

interface Props {
  /** Current cover value (raw CSS background) — used to enable Remove cover. */
  currentCover?: string | null;
  /** Work item + table so the Upload tab can read + write the image gallery.
   *  When either is missing the Upload tab still lets the user pick a local
   *  data URL, but no persistence occurs. */
  workItemId?: string | null;
  workItemTable?: WorkItemTable | null;
  onSelect: (cover: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

const SWATCH_SIZE = 30;
const SWATCH_GAP = 6;

const Swatch: React.FC<{ swatch: SwatchDef; onClick?: () => void }> = ({ swatch, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <Tooltip content={swatch.name}>
      <button
        type="button"
        aria-label={swatch.name}
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: SWATCH_SIZE,
          height: SWATCH_SIZE,
          borderRadius: 4,
          // Hover shows a bold focus border to indicate the tile is clickable
          // (Jira-parity). Rest state uses the subtle ADS border.
          border: `1px solid ${hover
            ? token('color.border.focused', 'var(--ds-border-focused)')
            : token('color.border', 'var(--ds-border)')}`,
          boxShadow: hover
            ? `0 0 0 1px ${token('color.border.focused', 'var(--ds-border-focused)')}`
            : 'none',
          background: swatch.background,
          cursor: 'pointer',
          padding: 0,
        }}
      />
    </Tooltip>
  );
};

const ColorsTab: React.FC<{ onPick: (bg: string) => void }> = ({ onPick }) => (
  <div style={{ padding: '4px 0 12px' }}>
    <div style={{
      fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
      color: token('color.text.subtle', 'var(--ds-text-subtle)'),
      marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase',
    }}>
      Solid colors
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: SWATCH_GAP, marginBottom: 16, alignItems: 'center' }}>
      {SOLID_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: SWATCH_GAP, justifyContent: 'center' }}>
          {row.map((s, ci) => <Swatch key={`${ri}-${ci}`} swatch={s} onClick={() => onPick(s.background)} />)}
        </div>
      ))}
    </div>

    <div style={{
      fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
      color: token('color.text.subtle', 'var(--ds-text-subtle)'),
      marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase',
    }}>
      Gradients
    </div>
    <div style={{ display: 'flex', gap: SWATCH_GAP, justifyContent: 'center' }}>
      {GRADIENTS.map((g, i) => <Swatch key={i} swatch={g} onClick={() => onPick(g.background)} />)}
    </div>
  </div>
);

/* Single gallery thumbnail with hover trash affordance + delete spinner. */
const GalleryThumb: React.FC<{
  img: CoverImage;
  isActive: boolean;
  isDeleting: boolean;
  onPick: () => void;
  onDelete: () => void;
}> = ({ img, isActive, isDeleting, onPick, onDelete }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        width: 68, height: 44,
        borderRadius: 4,
        overflow: 'hidden',
        border: `1px solid ${isActive
          ? token('color.border.focused', 'var(--ds-border-focused)')
          : token('color.border', 'var(--ds-border)')}`,
        boxShadow: isActive
          ? `0 0 0 1px ${token('color.border.focused', 'var(--ds-border-focused)')}`
          : 'none',
        opacity: isDeleting ? 0.55 : 1,
        pointerEvents: isDeleting ? 'none' : undefined,
      }}
    >
      <button
        type="button"
        aria-label="Use this cover"
        onClick={onPick}
        style={{
          width: '100%', height: '100%', padding: 0, border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'block',
        }}
      >
        <img
          src={img.image_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </button>
      {hover && !isDeleting && (
        <Tooltip content="Remove image">
          <button
            type="button"
            aria-label="Remove image"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute', top: 4, right: 4,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, border: 'none', borderRadius: 3,
              background: token('elevation.surface', 'var(--ds-surface)'),
              boxShadow: token('elevation.shadow.raised', 'var(--ds-shadow-raised)'),
              cursor: 'pointer',
            }}
          >
            <DeleteIcon label="" color={token('color.icon', 'var(--ds-icon)')} />
          </button>
        </Tooltip>
      )}
      {isDeleting && (
        <div
          aria-label="Removing"
          style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Spinner size="small" />
        </div>
      )}
    </div>
  );
};

const UploadTab: React.FC<{
  onPick: (bg: string) => void;
  workItemId?: string | null;
  workItemTable?: WorkItemTable | null;
  currentCover?: string | null;
}> = ({ onPick, workItemId, workItemTable, currentCover }) => {
  const canPersist = !!workItemId && !!workItemTable;
  const gallery = useCoverGallery(
    (workItemTable ?? 'ph_issues') as WorkItemTable,
    canPersist ? workItemId! : null,
  );
  const activeUrl = coverToUrl(currentCover);

  const handleFile = async (file: File) => {
    if (canPersist) {
      try {
        const row = await gallery.upload(file);
        onPick(imageCoverValue(row.image_url));
      } catch (err) {
        console.error('[cover] upload failed', err);
      }
      return;
    }
    // Fallback (no work item context): use a local data URL. Not persisted.
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      if (url) onPick(imageCoverValue(url));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: '4px 0 12px', position: 'relative' }}>
      <label
        htmlFor="cover-upload-input"
        aria-busy={gallery.isUploading}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, minHeight: 160, padding: 16, borderRadius: 6,
        border: `1px dashed ${token('color.border', 'var(--ds-border)')}`,
        background: token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle)'),
        color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        fontSize: 'var(--ds-font-size-300)', cursor: 'pointer', textAlign: 'center',
      }}
    >
      {gallery.isUploading ? (
        <>
          <Spinner size="medium" />
          <span>Uploading…</span>
        </>
      ) : (
        <>
          <ImageIcon label="" size="medium" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
          <span>Drag & drop an image, or click to browse</span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
            PNG or JPG, up to 5 MB
          </span>
        </>
      )}
        <input
          id="cover-upload-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
          disabled={gallery.isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            handleFile(file);
            e.target.value = '';
          }}
        />
      </label>

      {/* Thumbnail strip — uploaded images stay here until deleted; user
          can swap the active cover by clicking any thumbnail. */}
      {canPersist && gallery.images.length > 0 && (
        <div style={{
          marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap',
        }}>
          {gallery.images.map((img) => (
            <GalleryThumb
              key={img.id}
              img={img}
              isActive={activeUrl === img.image_url}
              isDeleting={gallery.deletingId === img.id}
              onPick={() => onPick(imageCoverValue(img.image_url))}
              onDelete={async () => {
                try {
                  const wasActive = activeUrl === img.image_url;
                  await gallery.remove(img);
                  // If the deleted image was the active cover, clear it too
                  // (Remove cover semantics for a per-image trash click).
                  if (wasActive) onPick(''); // caller treats empty as "no cover"
                } catch (err) {
                  console.error('[cover] delete failed', err);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SelectCoverPanel: React.FC<Props> = ({
  currentCover, workItemId, workItemTable, onSelect, onRemove, onClose,
}) => {
  const [selected, setSelected] = useState(0);
  const hasCover = !!currentCover;
  // Allow the Upload tab's "delete active image" branch to signal a clear
  // by calling onPick(''). Route empty selections through onRemove so the
  // cover column is nulled instead of set to an empty string.
  const handlePick = (bg: string) => (bg ? onSelect(bg) : onRemove());
  return (
    <div style={{ width: 380, display: 'flex', flexDirection: 'column' }}>
      {/* Shared header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 8px',
      }}>
        <span style={{
          fontSize: 'var(--ds-font-size-400)', fontWeight: 600,
          color: token('color.text', 'var(--ds-text)'),
        }}>
          Select a cover
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, border: 'none', background: 'transparent',
            cursor: 'pointer', borderRadius: 3,
          }}
        >
          <CrossIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
        </button>
      </div>

      {/* Shared tabs — TabList indented to align with the title's 16px inset. */}
      <div style={{ padding: '0 16px' }}>
        <Tabs id="select-cover-tabs" selected={selected} onChange={setSelected}>
          <TabList>
            <Tab>Colors</Tab>
            <Tab>Upload</Tab>
          </TabList>
          <TabPanel>
            <ColorsTab onPick={(bg) => { handlePick(bg); onClose(); }} />
          </TabPanel>
          <TabPanel>
            <UploadTab
              workItemId={workItemId}
              workItemTable={workItemTable}
              currentCover={currentCover}
              onPick={(bg) => { handlePick(bg); /* keep upload tab open for gallery mgmt */ }}
            />
          </TabPanel>
        </Tabs>
      </div>

      {/* Shared footer — tighter vertical padding. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '6px 16px',
        borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`,
      }}>
        <button
          type="button"
          onClick={() => { if (hasCover) { onRemove(); onClose(); } }}
          disabled={!hasCover}
          style={{
            border: 'none', background: 'transparent',
            color: hasCover
              ? token('color.text', 'var(--ds-text)')
              : token('color.text.disabled', 'var(--ds-text-disabled)'),
            fontSize: 'var(--ds-font-size-300)', fontFamily: 'inherit',
            cursor: hasCover ? 'pointer' : 'not-allowed', padding: '2px 8px',
          }}
        >
          Remove cover
        </button>
      </div>
    </div>
  );
};
