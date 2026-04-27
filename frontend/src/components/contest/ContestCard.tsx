import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Clock, User, Lock, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Contest } from '@shared/types';

interface ContestCardProps {
  contest: Contest & { creator_username?: string };
}

export const ContestCard: React.FC<ContestCardProps> = ({ contest }) => {
  const getStatusBadge = () => {
    switch (contest.status) {
      case 'running': return <Badge variant="success">Running</Badge>;
      case 'upcoming': return <Badge variant="info">Upcoming</Badge>;
      case 'ended': return <Badge variant="neutral">Ended</Badge>;
      default: return null;
    }
  };

  const startTime = new Date(contest.start_time);
  const endTime = new Date(contest.end_time);
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationStr = `${durationHours}h ${durationMinutes > 0 ? durationMinutes + 'm' : ''}`;

  return (
    <Link href={`/contests/${contest.id}`} className="block group">
      <Card className="h-full transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
              {contest.title}
            </h3>
            <div className="flex gap-2 shrink-0">
              {contest.is_public ? (
                <Badge variant="success" className="flex items-center gap-1"><Globe className="w-3 h-3"/> Public</Badge>
              ) : (
                <Badge variant="warning" className="flex items-center gap-1"><Lock className="w-3 h-3"/> Private</Badge>
              )}
              {getStatusBadge()}
            </div>
          </div>
          
          <div className="space-y-2 mt-auto text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{format(startTime, 'MMM d, yyyy - HH:mm')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{durationStr} duration</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[120px]">{contest.creator_username || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
