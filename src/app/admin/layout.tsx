import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopBar } from "@/components/admin/top-bar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-fd-bg">
      <AdminSidebar />
      <div className="ml-16">
        <AdminTopBar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
