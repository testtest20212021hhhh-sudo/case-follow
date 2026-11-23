import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

/* -------------------------------------------------------------------------- */
/*  Font registration (Traditional Chinese)                                    */
/* -------------------------------------------------------------------------- */

let fontsRegistered = false;

export function registerPdfFonts(origin: string): void {
  if (fontsRegistered) return;
  Font.register({
    family: "NotoSansTC",
    fonts: [
      { src: `${origin}/fonts/NotoSansTC-Regular.woff`, fontWeight: 400 },
      { src: `${origin}/fonts/NotoSansTC-Bold.woff`, fontWeight: 700 },
    ],
  });
  // CJK has no spaces; let react-pdf wrap character by character instead of
  // trying to hyphenate Latin words.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

/* -------------------------------------------------------------------------- */
/*  Data model for the printable record                                        */
/* -------------------------------------------------------------------------- */

export interface PdfField {
  label: string;
  value: string;
}

export interface PdfLongSection {
  heading: string;
  body: string;
  note?: string;
}

export interface PdfRecordData {
  /** e.g. "新增案件紀錄" / "跟進紀錄" */
  kind: string;
  title: string;
  reference: string;
  generatedAt: string;
  fields: PdfField[];
  sections: PdfLongSection[];
  attachments: string[];
  footerNote?: string;
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const INK = "#16211f";
const MUTED = "#6b7570";
const LINE = "#d9d2c0";
const BRAND = "#12433b";
const PAPER = "#f5f2ea";

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansTC",
    fontSize: 10.5,
    lineHeight: 1.65,
    color: INK,
    paddingTop: 54,
    paddingBottom: 64,
    paddingHorizontal: 52,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND,
    paddingBottom: 8,
    marginBottom: 14,
  },
  brand: {
    fontSize: 9,
    letterSpacing: 2,
    color: BRAND,
    fontWeight: 700,
  },
  brandSub: {
    fontSize: 7.5,
    color: MUTED,
    letterSpacing: 1.2,
    marginTop: 1,
  },
  kind: {
    fontSize: 8.5,
    color: MUTED,
    textAlign: "right",
  },
  reference: {
    fontSize: 9,
    color: INK,
    textAlign: "right",
    fontWeight: 700,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    lineHeight: 1.4,
    marginBottom: 12,
  },
  fieldGrid: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    backgroundColor: "#fbf9f4",
    paddingVertical: 2,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.6,
    borderBottomColor: LINE,
  },
  fieldRowLast: {
    borderBottomWidth: 0,
  },
  fieldLabel: {
    width: 86,
    fontSize: 8.5,
    color: MUTED,
    paddingTop: 1,
  },
  fieldValue: {
    flex: 1,
    fontSize: 10,
  },
  sectionHeading: {
    fontSize: 8.5,
    letterSpacing: 1.8,
    color: BRAND,
    fontWeight: 700,
    marginBottom: 5,
  },
  sectionNote: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 10.5,
    lineHeight: 1.75,
    textAlign: "left",
  },
  section: {
    marginBottom: 16,
  },
  rule: {
    borderBottomWidth: 0.6,
    borderBottomColor: LINE,
    marginBottom: 10,
  },
  attachmentItem: {
    flexDirection: "row",
    fontSize: 9.5,
    marginBottom: 2,
  },
  bullet: {
    width: 12,
    color: MUTED,
  },
  emptyBody: {
    fontSize: 9.5,
    color: MUTED,
  },
  footer: {
    position: "absolute",
    left: 52,
    right: 52,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.6,
    borderTopColor: LINE,
    paddingTop: 6,
    fontSize: 7.5,
    color: MUTED,
  },
  stamp: {
    alignSelf: "flex-start",
    backgroundColor: PAPER,
    borderWidth: 0.8,
    borderColor: LINE,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8,
    color: MUTED,
    marginBottom: 10,
  },
});

/* -------------------------------------------------------------------------- */
/*  Document                                                                   */
/* -------------------------------------------------------------------------- */

export function RecordDocument({ data }: { data: PdfRecordData }) {
  return (
    <Document
      title={`${data.title} — ${data.kind}`}
      author="陳情檔案 Civic Casework Archive"
      subject={data.kind}
      language="zh-Hant"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} fixed>
          <View>
            <Text style={styles.brand}>陳情檔案</Text>
            <Text style={styles.brandSub}>CIVIC CASEWORK ARCHIVE</Text>
          </View>
          <View>
            <Text style={styles.kind}>{data.kind}</Text>
            <Text style={styles.reference}>{data.reference}</Text>
          </View>
        </View>

        <Text style={styles.stamp}>本機備份 · 產生於 {data.generatedAt}</Text>
        <Text style={styles.title}>{data.title}</Text>

        <View style={styles.fieldGrid}>
          {data.fields.map((field, index) => (
            <View
              key={`${field.label}-${index}`}
              style={
                index === data.fields.length - 1
                  ? [styles.fieldRow, styles.fieldRowLast]
                  : styles.fieldRow
              }
              wrap={false}
            >
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={styles.fieldValue}>{field.value || "—"}</Text>
            </View>
          ))}
        </View>

        {data.sections.map((section, index) => (
          <View key={`${section.heading}-${index}`} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            {section.note ? (
              <Text style={styles.sectionNote}>{section.note}</Text>
            ) : null}
            <View style={styles.rule} />
            {section.body.trim() ? (
              <Text style={styles.sectionBody}>{section.body}</Text>
            ) : (
              <Text style={styles.emptyBody}>（未填寫）</Text>
            )}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>附件清單</Text>
          <View style={styles.rule} />
          {data.attachments.length === 0 ? (
            <Text style={styles.emptyBody}>（本次沒有上載附件）</Text>
          ) : (
            data.attachments.map((name, index) => (
              <View key={`${name}-${index}`} style={styles.attachmentItem}>
                <Text style={styles.bullet}>{index + 1}.</Text>
                <Text>{name}</Text>
              </View>
            ))
          )}
        </View>

        {data.footerNote ? (
          <Text style={styles.emptyBody}>{data.footerNote}</Text>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{data.reference} · {data.kind}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `第 ${pageNumber} / ${totalPages} 頁`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
