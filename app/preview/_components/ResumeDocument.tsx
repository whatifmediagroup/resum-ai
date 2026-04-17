"use client";
import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { ResumeJson } from "@/lib/schema";

const PADDING = 36;
const USABLE_PT = 792 - 2 * PADDING;
const FONT_SIZES = [11.5, 11, 10.5, 10] as const;

function estimateHeightPt(
  data: ResumeJson,
  experience: ResumeJson["experience"],
  fontSize: number
): number {
  const lineH = fontSize * 1.35;
  const sectionOverhead = 18 + 11 + 2 + 8; // marginTop + titleFontSize + paddingBottom + marginBottom

  let h = fontSize * 2 + 2 + lineH; // name + contact
  if (Object.values(data.header.links).some(Boolean)) h += lineH + 2;

  h += sectionOverhead + Math.ceil(data.summary.length / 85) * lineH;

  h += sectionOverhead;
  for (const job of experience) {
    h += lineH + 3 + job.bullets.length * (lineH + 3) + 12;
  }

  if (data.education.length > 0) {
    h += sectionOverhead + data.education.length * (lineH + 4);
  }

  h += sectionOverhead + lineH;

  return h;
}

function buildRenderData(data: ResumeJson): {
  fontSize: number;
  experience: ResumeJson["experience"];
} {
  for (const fontSize of FONT_SIZES) {
    for (let n = data.experience.length; n >= 1; n--) {
      const experience = data.experience.slice(0, n);
      if (estimateHeightPt(data, experience, fontSize) <= USABLE_PT) {
        return { fontSize, experience };
      }
    }
  }
  return { fontSize: 10, experience: data.experience.slice(0, 1) };
}

function makeStyles(fontSize: number) {
  return StyleSheet.create({
    page: { padding: PADDING, fontSize, fontFamily: "Helvetica", color: "#111", lineHeight: 1.35 },
    name: { fontSize: 20, fontWeight: 700 },
    contact: { marginTop: 2, color: "#555", fontSize: 9 },
    section: { marginTop: 18 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      borderBottom: "1 solid #000",
      paddingBottom: 2,
      marginBottom: 8,
    },
    jobHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
    jobTitle: { fontWeight: 700 },
    dates: { color: "#555" },
    bullet: { marginLeft: 10, marginTop: 3 },
    linkRow: { color: "#0645AD", fontSize: 9, marginTop: 2 },
  });
}

export function ResumeDocument({ data }: { data: ResumeJson }) {
  const { fontSize, experience } = buildRenderData(data);
  const styles = makeStyles(fontSize);

  const contactLine = [data.header.contact.phone, data.header.contact.email, data.header.contact.location]
    .filter(Boolean)
    .join("  •  ");

  const links = data.header.links;
  const linkEntries = [
    links.linkedIn && { label: "LinkedIn", href: links.linkedIn },
    links.portfolio && { label: "Portfolio", href: links.portfolio },
    links.github && { label: "GitHub", href: links.github },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{data.header.fullName}</Text>
        <Text style={styles.contact}>{contactLine}</Text>
        {linkEntries.length > 0 ? (
          <View style={styles.linkRow}>
            {linkEntries.map((l, i) => (
              <Link key={i} src={l.href}>
                {l.label}
                {i < linkEntries.length - 1 ? "  •  " : ""}
              </Link>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text>{data.summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {experience.map((job, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>
                  {job.title} — {job.company}
                </Text>
                <Text style={styles.dates}>{job.dates}</Text>
              </View>
              {job.bullets.map((b, bi) => (
                <Text key={bi} style={styles.bullet}>
                  • {b}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {data.education.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((e, i) => (
              <View key={i} style={styles.jobHeader}>
                <Text style={styles.jobTitle}>
                  {e.credential} — {e.institution}
                </Text>
                <Text style={styles.dates}>{e.dates}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Text>{data.skills.join("  •  ")}</Text>
        </View>
      </Page>
    </Document>
  );
}
