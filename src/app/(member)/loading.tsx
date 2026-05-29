import { SkeletonMemberPage, SkeletonStatCards, SkeletonCardGrid } from "@/components/skeletons"

export default function MemberLoading() {
  return (
    <SkeletonMemberPage>
      <SkeletonStatCards count={4} />
      <div className="h-6 w-40 rounded bg-zinc-800" />
      <SkeletonCardGrid count={8} />
    </SkeletonMemberPage>
  )
}
