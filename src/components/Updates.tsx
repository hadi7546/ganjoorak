"use client";

import React, { useEffect, useState } from "react";
import "../styles/Updates.css";
import Menu, { MenuButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import UpdateAccordionItem from "@/components/UpdateAccordionItem";
import { updates } from "@/data/updates";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";

const Updates = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { hasNewUpdates, markAsRead } = useUpdateNotification();

  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  return (
    <div className="updates-container">
      <MenuButton
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        hasNotification={hasNewUpdates}
      />
      <Menu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        hasNewUpdates={hasNewUpdates}
        onUpdatesViewed={markAsRead}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setIsMenuOpen(false);
        }}
      />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
        }}
      />

      <h1 className="updates-title">بروزرسانی‌ها</h1>
      <div className="updates-list">
        {updates.map((update, index) => (
          <UpdateAccordionItem
            key={update.version}
            update={update}
            defaultOpen={index === 0}
          />
        ))}
      </div>
    </div>
  );
};

export default Updates;
