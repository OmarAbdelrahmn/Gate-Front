import {
  CircleUserRound,
  BriefcaseBusiness,
  ClipboardList,
  Building2,
  LayoutDashboard,
  House,
  ShieldCheck,
  Users,
  Layers,
  Server,
  History,
  type LucideIcon,
} from "lucide-react";
export type Role = "admin" | "member" | "accountant";
export type NavItem = {
  label: string;
  labelKey?: string;
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
    labelKey: "nav.dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "member", "accountant"],
  },
  {
    label: "الموارد البشرية",
    labelKey: "nav.hr",
    icon: BriefcaseBusiness,
    roles: ["admin", "member"],
    children: [
      {
        label: "جميع الإداريين والمناديب",
        labelKey: "nav.employees",
        href: "/dashboard/employees",
        icon: Users,
        roles: ["admin", "member"],
        permission: "employees.read",
      },
      {
        label: "الكفلاء",
        labelKey: "nav.sponsors",
        href: "/dashboard/employees/sponsors",
        icon: Building2,
        roles: ["admin", "member"],
        permission: "sponsors.read",
      },
      {
        label: "إعدادات المدن",
        labelKey: "nav.cities",
        href: "/dashboard/employees/cities",
        icon: Building2,
        roles: ["admin", "member"],
        permission: "operating_cities.read",
      },
      {
        label: "كتالوجات الموظفين",
        labelKey: "nav.catalogs",
        href: "/dashboard/hr/catalogs",
        icon: BriefcaseBusiness,
        roles: ["admin", "member"],
        permissionsAny: ["employees.read", "residency.read", "licenses.read"],
      },
      {
        label: "التأمين الطبي",
        labelKey: "nav.insurance",
        href: "/dashboard/hr/insurance",
        icon: ShieldCheck,
        roles: ["admin", "member"],
        permission: "insurance.read",
      },
      {
        label: "حالات الغياب",
        labelKey: "nav.absenceCases",
        href: "/dashboard/hr/absence-cases",
        icon: ClipboardList,
        roles: ["admin", "member"],
        permission: "absence_cases.read",
      },
      {
        label: "طلبات تغيير الحالة",
        labelKey: "nav.statusChangeRequests",
        href: "/dashboard/hr/employee-status-change-requests",
        icon: ClipboardList,
        roles: ["admin", "member"],
        permission: "employee_status_changes.read",
      },
    ],
  },
  {
    label: "إدارة السكن",
    labelKey: "nav.housing",
    icon: House,
    roles: ["admin", "member"],
    children: [
      {
        label: "السكن",
        labelKey: "nav.housing",
        href: "/dashboard/housing",
        icon: House,
        roles: ["admin", "member"],
        permission: "housing.read",
      },
    ],
  },
  {
    label: "إدارة المنصات",
    labelKey: "nav.platforms",
    icon: Layers,
    roles: ["admin", "member"],
    permissionsAny: ["platform_accounts.read", "platform_assignments.read"],
    children: [
      {
        label: "المنصات",
        labelKey: "nav.platformList",
        href: "/dashboard/platforms",
        icon: Layers,
        roles: ["admin", "member"],
        permission: "platform_accounts.read",
      },
      {
        label: "حسابات المنصات",
        labelKey: "nav.platformAccounts",
        href: "/dashboard/platforms/accounts",
        icon: Server,
        roles: ["admin", "member"],
        permission: "platform_accounts.read",
      },
      {
        label: "سجل المنصات للمندوب",
        labelKey: "nav.riderPlatformHistory",
        href: "/dashboard/platforms/rider-history",
        icon: History,
        roles: ["admin", "member"],
        permission: "platform_assignments.read",
      },
    ],
  },
  {
    label: "إدارة المستخدمين",
    labelKey: "nav.userManagement",
    icon: ShieldCheck,
    roles: ["admin"],
    children: [
      {
        label: "المستخدمون",
        labelKey: "nav.users",
        href: "/dashboard/users",
        icon: Users,
        roles: ["admin"],
        permission: "users.read",
      },
      {
        label: "الأدوار",
        labelKey: "nav.roles",
        href: "/dashboard/users/roles",
        icon: ShieldCheck,
        roles: ["admin"],
        permission: "roles.read",
      },
    ],
  },
  {
    label: "ملفي الشخصي",
    labelKey: "nav.profile",
    href: "/dashboard/profile",
    icon: CircleUserRound,
    roles: ["admin", "member", "accountant"],
  },
];
