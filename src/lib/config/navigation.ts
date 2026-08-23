import {
  CircleUserRound,
  BriefcaseBusiness,
  ClipboardList,
  Building2,
  LayoutDashboard,
  House,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
export type Role = "admin" | "member" | "accountant";
export type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  roles: Role[];
  permission?: string;
  permissionsAny?: string[];
  children?: NavItem[];
};
export const navigation: NavItem[] = [
  {
    label: "الرئيسية",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "member", "accountant"],
  },
  {
    label: "الموارد البشرية",
    icon: BriefcaseBusiness,
    roles: ["admin", "member"],
    children: [
      {
        label: "جميع الإداريين والمناديب",
        href: "/dashboard/employees",
        icon: Users,
        roles: ["admin", "member"],
        permission: "employees.read",
      },
      {
        label: "الكفلاء",
        href: "/dashboard/employees/sponsors",
        icon: Building2,
        roles: ["admin", "member"],
        permission: "sponsors.read",
      },
      {
        label: "إعدادات المدن",
        href: "/dashboard/employees/cities",
        icon: Building2,
        roles: ["admin", "member"],
        permission: "operating_cities.read",
      },
      {
        label: "كتالوجات الموظفين",
        href: "/dashboard/hr/catalogs",
        icon: BriefcaseBusiness,
        roles: ["admin", "member"],
        permissionsAny: ["employees.read", "residency.read", "licenses.read"],
      },
      // { label: "أنواع الوثائق", href: "/dashboard/hr/document-types", icon: ClipboardList, roles: ["admin", "member"], permission: "documents.read" },
      // Hidden from the sidebar until the document-requirements workflow is ready.
      // { label: "متطلبات الوثائق", href: "/dashboard/hr/document-requirements", icon: ClipboardList, roles: ["admin", "member"], permission: "documents.read" },
      // Hidden from the sidebar until the leave workflows are ready.
      // { label: "أنواع الإجازات", href: "/dashboard/hr/leave-types", icon: CalendarDays, roles: ["admin", "member"], permission: "leave_requests.read" },
      // { label: "مسارات اعتماد الإجازات", href: "/dashboard/hr/leave-approval-workflows", icon: CalendarDays, roles: ["admin", "member"], permission: "leave_requests.read" },
      // { label: "طلبات الإجازات", href: "/dashboard/hr/leave-requests", icon: CalendarDays, roles: ["admin", "member"], permission: "leave_requests.read" },
      {
        label: "حالات الغياب",
        href: "/dashboard/hr/absence-cases",
        icon: ClipboardList,
        roles: ["admin", "member"],
        permission: "absence_cases.read",
      },
      {
        label: "طلبات تغيير الحالة",
        href: "/dashboard/hr/employee-status-change-requests",
        icon: ClipboardList,
        roles: ["admin", "member"],
        permission: "employee_status_changes.read",
      },
    ],
  },
  {
    label: "إدارة السكن",
    icon: House,
    roles: ["admin", "member"],
    children: [
      {
        label: "السكن",
        href: "/dashboard/housing",
        icon: House,
        roles: ["admin", "member"],
        permission: "housing.read",
      },
    ],
  },
  {
    label: "إدارة المستخدمين",
    icon: ShieldCheck,
    roles: ["admin"],
    children: [
      {
        label: "المستخدمون",
        href: "/dashboard/users",
        icon: Users,
        roles: ["admin"],
        permission: "users.read",
      },
      {
        label: "الأدوار",
        href: "/dashboard/users/roles",
        icon: ShieldCheck,
        roles: ["admin"],
        permission: "roles.read",
      },
    ],
  },
  {
    label: "ملفي الشخصي",
    href: "/dashboard/profile",
    icon: CircleUserRound,
    roles: ["admin", "member", "accountant"],
  },
];
