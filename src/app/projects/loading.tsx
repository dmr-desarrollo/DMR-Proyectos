import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProjectsLoading() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-64" />
      </div>
      
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col space-y-2">
            <Skeleton className="h-7 w-32" />
            <Card className="min-h-[200px]">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                 <Skeleton className="h-5 w-1/4" />
                 <Skeleton className="h-4 w-1/2" />
                 <div className="flex justify-end">
                    <Skeleton className="h-5 w-1/3" />
                 </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
