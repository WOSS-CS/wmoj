import { ContestList } from "@/components/contests/contest-list"

export default function ContestsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contests</h1>
        <p className="text-muted-foreground">
          Participate in programming contests to test your skills and compete with others.
        </p>
      </div>
      
      <ContestList />
    </div>
  )
}
