"use client";

import React, { useEffect, useState } from "react";
import "../styles/Updates.css";
import Menu, { MenuButton, SearchButton } from "@/components/Menu";
import SettingsDialog from "@/components/SettingsDialog";
import { motion } from "framer-motion";
import { updates } from "@/data/updates";
import { useUpdateNotification } from "@/hooks/useUpdateNotification";
import SearchDialog from "@/components/SearchDialog";

const Updates = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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
      <SearchButton
        onClick={() => {
          setIsMenuOpen(false);
          setIsSearchOpen(true);
        }}
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
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onResultSelect={() => setIsSearchOpen(false)}
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            key={index}
            className="update-item"
          >
            <div className="update-header">
              <h3 className="update-version">نسخه {update.version}</h3>
              <span className="update-date">{update.date}</span>
            </div>
            <ul className="update-changes">
              {update.changes.map((change, changeIndex) => (
                <li key={changeIndex}>{change}</li>
              ))}
            </ul>
            {update.video && (
              <div className="update-media">
                <video className="update-video" controls preload="metadata">
                  <source src={update.video} type="video/mp4" />
                  مرورگر شما از ویدیو پشتیبانی نمی‌کند.
                </video>
              </div>
            )}
            {update.image && (
              <div className="update-media">
                <img
                  className="update-image"
                  src={update.image}
                  alt={`عکس نسخه ${update.version}`}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Updates;
