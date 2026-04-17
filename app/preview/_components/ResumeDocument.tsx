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
    page: { padding: PADDING, fontSize, fontFamily: "Helvetica", color: "#111", lineHeight: 1.3 },
    header: {
      alignItems: "center",
      paddingBottom: 7,
      marginBottom: 4,
      borderBottom: "0.5 solid #D4D4D4",
    },
    name: {
      fontSize: 24,
      fontWeight: 700,
      lineHeight: 1.15,
      marginBottom: 4,
      textAlign: "center",
    },
    contact: {
      color: "#555",
      fontSize: 8.5,
      lineHeight: 1.3,
      textAlign: "center",
    },
    section: { marginTop: 12 },
    sectionTitle: {
      fontSize: 10.5,
      fontWeight: 700,
      textTransform: "uppercase",
      color: "#000",
      borderBottom: "1 solid #111",
      paddingBottom: 2,
      marginBottom: 6,
    },
    jobHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    jobHeaderLeft: { flex: 1, paddingRight: 8 },
    jobTitle: { fontWeight: 700, fontSize: fontSize + 0.5, color: "#000" },
    jobCompany: { color: "#444", fontSize: fontSize - 0.5, marginTop: 0, marginBottom: 2 },
    dates: { color: "#555", flexShrink: 0, fontSize: fontSize - 0.5 },
    bullet: { marginLeft: 10, marginTop: 2 },
    linkRow: {
      flexDirection: "row",
      justifyContent: "center",
      color: "#0645AD",
      fontSize: 8.5,
      marginTop: 4,
    },
    linkSep: { color: "#888", marginHorizontal: 6 },
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
        <View style={styles.header}>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text>{data.summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {experience.map((job, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <View style={styles.jobHeader}>
                <View style={styles.jobHeaderLeft}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                </View>
                <Text style={styles.dates}>{job.dates}</Text>
              </View>
              <Text style={styles.jobCompany}>{job.company}</Text>
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
              <View key={i} style={{ marginBottom: 4 }}>
                <View style={styles.jobHeader}>
                  <View style={styles.jobHeaderLeft}>
                    <Text style={styles.jobTitle}>{e.credential}</Text>
                  </View>
                  {e.dates ? <Text style={styles.dates}>{e.dates}</Text> : null}
                </View>
                <Text style={styles.jobCompany}>{e.institution}</Text>
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
