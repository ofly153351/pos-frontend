import { ScrollText } from "lucide-react";

export default function ActivityLogsPage() {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="h-5 w-5 text-violet-500" />
        <h1 className="text-xl font-bold text-slate-900">Activity Logs</h1>
      </div>
      <p className="text-sm text-slate-500">บันทึกกิจกรรมในระบบ — coming soon</p>
    </div>
  );
}
