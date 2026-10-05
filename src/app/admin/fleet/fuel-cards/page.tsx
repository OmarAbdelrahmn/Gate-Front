"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { FuelCard } from "@/lib/fleet/fuel-cards-api";
import { FuelCardsNav, FuelCardsTab } from "./components/FuelCardsNav";
import { FuelCardsListView } from "./components/FuelCardsListView";
import { FuelCardPeriodUsageView } from "./components/FuelCardPeriodUsageView";
import { FuelMonthlyUsageView } from "./components/FuelMonthlyUsageView";
import { FuelImportView } from "./components/FuelImportView";
import { FuelImportHistoryView } from "./components/FuelImportHistoryView";

import { CreateFuelCardModal } from "./components/CreateFuelCardModal";
import { AssignFuelCardRiderModal } from "./components/AssignFuelCardRiderModal";
import { StopFuelCardRiderModal } from "./components/StopFuelCardRiderModal";
import { FuelCardAssignmentsModal } from "./components/FuelCardAssignmentsModal";
import { FuelCardDetailsModal } from "./components/FuelCardDetailsModal";
import { ChangeFuelCardSponsorModal } from "./components/ChangeFuelCardSponsorModal";
import { ChangeFuelCardCityModal } from "./components/ChangeFuelCardCityModal";
import { ShieldAlert } from "lucide-react";

export default function FuelCardsPage() {
  const { user, can } = useAuth();

  const canRead =
    can("fuel.read") ||
    user?.roles?.includes("admin") ||
    user?.userName === "omar";

  const canManage =
    can("fuel.manage") ||
    user?.roles?.includes("admin") ||
    user?.userName === "omar";

  const canImport =
    can("fuel.import") ||
    user?.roles?.includes("admin") ||
    user?.userName === "omar";

  const [activeTab, setActiveTab] = useState<FuelCardsTab>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignModalCard, setAssignModalCard] = useState<FuelCard | null>(null);
  const [stopModalCard, setStopModalCard] = useState<FuelCard | null>(null);
  const [historyModalCard, setHistoryModalCard] = useState<FuelCard | null>(null);
  const [detailModalCardId, setDetailModalCardId] = useState<string | null>(null);
  const [changeSponsorCard, setChangeSponsorCard] = useState<FuelCard | null>(null);
  const [changeCityCard, setChangeCityCard] = useState<FuelCard | null>(null);

  if (!canRead) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="max-w-md mx-auto p-6 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 space-y-3">
          <ShieldAlert size={40} className="mx-auto text-red-600" />
          <h2 className="text-lg font-bold">عفواً، لا تملك صلاحية الوصول</h2>
          <p className="text-xs">
            تتطلب هذه الصفحة صلاحية قراءة بيانات الوقود (fuel.read). يرجى التواصل مع مسؤول النظام لتحديث صلاحياتك.
          </p>
        </div>
      </div>
    );
  }

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleNavigateToCardFromImport = (cardNumber: string) => {
    setSearchQuery(cardNumber);
    setActiveTab("cards");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header Navigation */}
      <FuelCardsNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onRefresh={triggerRefresh}
        onOpenCreate={() => setIsCreateOpen(true)}
        canManage={canManage}
        canImport={canImport}
      />

      {/* Main Tab Content */}
      {activeTab === "cards" && (
        <FuelCardsListView
          key={refreshKey}
          searchQuery={searchQuery}
          onSearchChange={(val) => setSearchQuery(val)}
          canManage={canManage}
          onOpenAssign={(card) => setAssignModalCard(card)}
          onOpenStop={(card) => setStopModalCard(card)}
          onOpenHistory={(card) => setHistoryModalCard(card)}
          onOpenDetail={(cardId) => setDetailModalCardId(cardId)}
          onOpenChangeSponsor={(card) => setChangeSponsorCard(card)}
          onOpenChangeCity={(card) => setChangeCityCard(card)}
        />
      )}

      {activeTab === "period-usage" && (
        <FuelCardPeriodUsageView
          key={refreshKey}
          onOpenDetail={(cardId) => setDetailModalCardId(cardId)}
        />
      )}

      {activeTab === "monthly" && <FuelMonthlyUsageView key={refreshKey} />}

      {activeTab === "import" && (
        <FuelImportView onNavigateToCard={handleNavigateToCardFromImport} />
      )}

      {activeTab === "history" && <FuelImportHistoryView key={refreshKey} />}

      {/* Dialogs / Modals */}
      <CreateFuelCardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <AssignFuelCardRiderModal
        isOpen={assignModalCard !== null}
        onClose={() => setAssignModalCard(null)}
        card={assignModalCard}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <StopFuelCardRiderModal
        isOpen={stopModalCard !== null}
        onClose={() => setStopModalCard(null)}
        card={stopModalCard}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <FuelCardAssignmentsModal
        isOpen={historyModalCard !== null}
        onClose={() => setHistoryModalCard(null)}
        card={historyModalCard}
      />

      <FuelCardDetailsModal
        isOpen={detailModalCardId !== null}
        onClose={() => setDetailModalCardId(null)}
        cardId={detailModalCardId}
        canManage={canManage}
        onOpenAssign={(card) => {
          setDetailModalCardId(null);
          setAssignModalCard(card);
        }}
        onOpenStop={(card) => {
          setDetailModalCardId(null);
          setStopModalCard(card);
        }}
        onOpenHistory={(card) => {
          setDetailModalCardId(null);
          setHistoryModalCard(card);
        }}
        onOpenChangeSponsor={(card) => {
          setDetailModalCardId(null);
          setChangeSponsorCard(card);
        }}
        onOpenChangeCity={(card) => {
          setDetailModalCardId(null);
          setChangeCityCard(card);
        }}
      />

      <ChangeFuelCardSponsorModal
        isOpen={changeSponsorCard !== null}
        onClose={() => setChangeSponsorCard(null)}
        card={changeSponsorCard}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <ChangeFuelCardCityModal
        isOpen={changeCityCard !== null}
        onClose={() => setChangeCityCard(null)}
        card={changeCityCard}
        onSuccess={() => {
          triggerRefresh();
        }}
      />
    </div>
  );
}
