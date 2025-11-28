import { JiraAlignHeader } from "@/components/ja/JiraAlignHeader";
import { HomeContent } from "@/components/ja/HomeContent";

export default function JaHome() {
  return (
    <div className="min-h-screen bg-background">
      <JiraAlignHeader />
      <HomeContent />
    </div>
  );
}
