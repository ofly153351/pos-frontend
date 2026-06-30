import type { CSSProperties } from "react";

type Props = {
  leftTH: string;
  leftEN: string;
  rightTH?: string;
  rightEN?: string;
};

const labelStyle: CSSProperties = {
  fontSize: "8.5pt",
  fontWeight: 700,
  borderBottom: "1px solid #cbd5e1",
  paddingBottom: "0.5mm",
  marginBottom: "3mm",
  textAlign: "center",
};

// justifyContent:center keeps the signing content centered INSIDE each 56mm column
// (a fixed-width underline left-packed in the column would drift the visible group
// off-centre even though the columns themselves are centered).
const writeRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "baseline",
  gap: "1.5mm",
  marginBottom: "2mm",
};

const writeLblStyle: CSSProperties = {
  fontSize: "8.5pt",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const lineStyle: CSSProperties = {
  width: "40mm",
  flexShrink: 0,
  borderBottom: "1px solid #cbd5e1",
  paddingTop: "9mm",
};

const dateRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "baseline",
  gap: "1mm",
  fontSize: "8pt",
  color: "#94a3b8",
};

const dateSegStyle: CSSProperties = {
  width: "13mm",
  borderBottom: "1px solid #cbd5e1",
};

function SigCol({ labelTH, labelEN }: { labelTH: string; labelEN: string }) {
  return (
    <div style={{ width: "56mm", flexShrink: 0 }}>
      <div style={labelStyle}>
        {labelTH} / {labelEN}
      </div>
      <div style={writeRowStyle}>
        <span style={writeLblStyle}>ลงชื่อ</span>
        <span style={lineStyle} />
      </div>
      <div style={dateRowStyle}>
        <span>วันที่</span>
        <span style={dateSegStyle} />
        <span>/</span>
        <span style={dateSegStyle} />
        <span>/</span>
        <span style={dateSegStyle} />
      </div>
    </div>
  );
}

export function SignatureBlock({ leftTH, leftEN, rightTH, rightEN }: Props) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "20mm",
        marginTop: "7mm",
      }}
    >
      <SigCol labelTH={leftTH} labelEN={leftEN} />
      {rightTH && rightEN && <SigCol labelTH={rightTH} labelEN={rightEN} />}
    </div>
  );
}
