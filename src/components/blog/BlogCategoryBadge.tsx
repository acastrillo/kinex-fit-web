import { Badge } from "@/components/ui/badge";

const categoryColors: Record<string, string> = {
  FITNESS: "border-[#FF6B35]/40 text-[#FF6B35] bg-[#FF6B35]/10",
  NUTRITION: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  RECOVERY: "border-blue-500/40 text-blue-400 bg-blue-500/10",
  WELLNESS: "border-purple-500/40 text-purple-400 bg-purple-500/10",
};

export function BlogCategoryBadge({ category }: { category: string }) {
  const colors = categoryColors[category] || categoryColors.FITNESS;
  return (
    <Badge variant="outline" className={`${colors} text-xs font-mono uppercase`}>
      {category}
    </Badge>
  );
}
