"use client";
import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { ResumeJson } from "@/lib/schema";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  name: { fontSize: 20, fontWeight: 700 },
  contact: { marginTop: 2, color: "#555", fontSize: 9 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    borderBottom: "1 solid #000",
    paddingBottom: 2,
    marginBottom: 6,
  },
  jobHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  jobTitle: { fontWeight: 700 },
  dates: { color: "#555" },
  bullet: { marginLeft: 10, marginTop: 2 },
  linkRow: { color: "#0645AD", fontSize: 9, marginTop: 2 },
});

export function ResumeDocument({ data }: { data: ResumeJson }) {
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
          {data.experience.map((job, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Text>{data.skills.join("  •  ")}</Text>
        </View>
      </Page>
    </Document>
  );
}
