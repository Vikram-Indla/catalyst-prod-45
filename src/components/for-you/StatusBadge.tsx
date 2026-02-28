import React from 'react';

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { display: string; dotColor: string; textColor: string; bgColor: string }> = {
    "Ready for Development": { display: "Ready for Dev",  dotColor: "#0D9488", textColor: "#0A8277", bgColor: "#F0FDFA" },
    "Ready for Dev":         { display: "Ready for Dev",  dotColor: "#0D9488", textColor: "#0A8277", bgColor: "#F0FDFA" },
    "In Development":        { display: "In Dev",         dotColor: "#0D9488", textColor: "#0A8277", bgColor: "#F0FDFA" },
    "In Dev":                { display: "In Dev",         dotColor: "#0D9488", textColor: "#0A8277", bgColor: "#F0FDFA" },
    "In Progress":           { display: "In Progress",    dotColor: "#0D9488", textColor: "#0A8277", bgColor: "#F0FDFA" },
    "End to End Testing":    { display: "E2E Testing",    dotColor: "#D97706", textColor: "#AF6003", bgColor: "#FFFBEB" },
    "E2E Testing":           { display: "E2E Testing",    dotColor: "#D97706", textColor: "#AF6003", bgColor: "#FFFBEB" },
    "In Review":             { display: "In Review",      dotColor: "#D97706", textColor: "#AF6003", bgColor: "#FFFBEB" },
    "In Production":         { display: "In Prod",        dotColor: "#16A34A", textColor: "#11853D", bgColor: "#F0FDF4" },
    "In Prod":               { display: "In Prod",        dotColor: "#16A34A", textColor: "#11853D", bgColor: "#F0FDF4" },
    "Done":                  { display: "Done",           dotColor: "#16A34A", textColor: "#11853D", bgColor: "#F0FDF4" },
    "ToDo":                  { display: "To Do",          dotColor: "#2563EB", textColor: "#2563EB", bgColor: "#EFF6FF" },
    "To Do":                 { display: "To Do",          dotColor: "#2563EB", textColor: "#2563EB", bgColor: "#EFF6FF" },
    "Planned":               { display: "Planned",        dotColor: "#2563EB", textColor: "#2563EB", bgColor: "#EFF6FF" },
    "Backlog":               { display: "Backlog",        dotColor: "#6F6F78", textColor: "#6F6F78", bgColor: "#F4F4F5" },
    "Blocked":               { display: "Blocked",        dotColor: "#DC2626", textColor: "#D92525", bgColor: "#FEF2F2" },
    "Cancelled":             { display: "Cancelled",      dotColor: "#71717A", textColor: "#71717A", bgColor: "#F4F4F5" },
  };

  const c = config[status] || { display: status, dotColor: "#71717A", textColor: "#71717A", bgColor: "#F4F4F5" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        height: "22px",
        padding: "0 10px",
        borderRadius: "9999px",
        backgroundColor: c.bgColor,
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: c.dotColor,
          flexShrink: 0,
        }}
      />
      <span style={{ color: c.textColor }}>
        {c.display}
      </span>
    </span>
  );
}

export default StatusBadge;
