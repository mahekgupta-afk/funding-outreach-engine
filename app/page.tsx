import Link from "next/link";
import Nav from "@/components/Nav";

export default function HeroPage() {
  return (
    <>
      <Nav />
      <section className="hero">
        <div className="heroMesh" />
        <div className="heroContent">
          <span className="heroEyebrow">
            <span className="heroEyebrowDot" />
            Pre-Seed &amp; Seed Intelligence
          </span>
          <h1 className="heroHeadline">
            Funding
            <span className="heroHeadlineLine2">Outreach Engine</span>
          </h1>
          <Link
            href="/news"
            className="button buttonPrimary buttonGlow"
            style={{ marginTop: 40, padding: "16px 32px", fontSize: "0.8rem" }}
          >
            Initialize →
          </Link>
        </div>

        <div className="waveContainer">
          <div className="waveCurve" />
        </div>
      </section>
    </>
  );
}
