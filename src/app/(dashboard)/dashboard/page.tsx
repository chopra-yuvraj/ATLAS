// src/app/(dashboard)/dashboard/page.tsx
import { QueueBoard } from '@/components/queue/QueueBoard';

export default function DashboardPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Live Triage Queue</h1>
                <p className="text-sm text-muted-foreground">
                    Patients sorted by priority score — updates automatically in real time
                </p>
            </div>
            <QueueBoard />
        </div>
    );
}
