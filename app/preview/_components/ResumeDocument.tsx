"use client";
import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { ResumeJson } from "@/lib/schema";

export const PADDING = 36;
export const USABLE_PT = 792 - 2 * PADDING;
export const FONT_SIZES = [11.5, 11, 10.5, 10] as const;

export type ResumeRenderConfig = {
  fontSize: number;
  experience: ResumeJson["experience"];
};

export function defaultRenderConfig(data: ResumeJson): ResumeRenderConfig {
  return { fontSize: FONT_SIZES[0], experience: data.experience };
}

function makeStyles(fontSize: number) {
  return StyleSheet.create({
    page: { padding: PADDING, fontSize, fontFamily: "Helvetica", color: "#111", lineHeight: 1.35 },
    name: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
    contact: { color: "#555", fontSize: 9 },
    section: { marginTop: 16 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      borderBottom: "1 solid #000",
      paddingBottom: 2,
      marginBottom: 8,
    },
    jobHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
    jobHeaderLeft: { flex: 1, paddingRight: 8 },
    jobTitle: { fontWeight: 700 },
    dates: { color: "#555", flexShrink: 0 },
    bullet: { marginLeft: 10, marginTop: 3 },
    linkRow: {
      flexDirection: "row",
      color: "#0645AD",
      fontSize: 9,
      marginTop: 3,
    },
    linkSep: { color: "#555", marginHorizontal: 6 },
  });
}

export function ResumeDocument({
  data,
  config,
}: {
  data: ResumeJson;
  config?: ResumeRenderConfig;
}) {
  const { fontSize, experience } = config ?? defaultRenderConfig(data);
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
              <Text key={i}>
                {i > 0 ? <Text style={styles.linkSep}>•</Text> : null}
                <Link src={l.href}>{l.label}</Link>
              </Text>
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
                <View style={styles.jobHeaderLeft}>
                  <Text style={styles.jobTitle}>
                    {job.title} — {job.company}
                  </Text>
                </View>
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
                <View style={styles.jobHeaderLeft}>
                  <Text style={styles.jobTitle}>
                    {e.credential} — {e.institution}
                  </Text>
                </View>
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
