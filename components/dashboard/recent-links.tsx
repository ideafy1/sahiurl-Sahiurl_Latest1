import { formatDistanceToNow } from "date-fns"
import { ExternalLink, LinkIcon as Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "@/lib/firebase/database-schema"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface RecentLinksProps {
  links: Link[];
}

export function RecentLinks({ links }: RecentLinksProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [links]);

  return (
    <div className="space-y-2">
      {isLoading ? (
        [...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))
      ) : links.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No links created yet</p>
        </div>
      ) : (
        links.map((link) => (
          <div key={link.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{link.title || link.shortUrl}</p>
                <p className="text-xs text-muted-foreground">
                  Created {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <a href={link.originalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Visit</span>
              </a>
            </Button>
          </div>
        ))
      )}
    </div>
  )
} 
