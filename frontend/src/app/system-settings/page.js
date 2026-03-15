"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Send,
  AlertTriangle,
  CheckSquare,
  Square,
  FileText,
  User,
  Calendar,
  MapPin,
  Shield,
  Cpu,
  Cable,
  Camera,
  Eye,
  Zap,
  BarChart3,
  Database,
  Brain,
  ScanLine,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import LayoutDashboard from "../components/LayoutDashboard";
import ProtectedPage from "../components/ProtectedPage";
export default function SystemSettingsPage() {


  return (
       <ProtectedPage> {
    <LayoutDashboard activeMenu={3}>
    </LayoutDashboard>
        }</ProtectedPage>
  );
}
