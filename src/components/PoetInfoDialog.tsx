"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaTimes } from "react-icons/fa";

interface PoetInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isDismissible?: boolean;
  children: React.ReactNode;
}

const PoetInfoDialog: React.FC<PoetInfoDialogProps> = ({
  isOpen,
  onClose,
  title,
  isDismissible = true,
  children,
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          className="settings-backdrop global-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isDismissible ? onClose : undefined}
        />
        <motion.div
          className="poet-info-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="poet-info-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="poet-info-title"
            initial={{ scale: 0.96, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 18 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.18 }}
          >
            <header className="poet-info-header">
              <h2 id="poet-info-title">{title}</h2>
              {isDismissible && (
                <button type="button" onClick={onClose} aria-label="بستن">
                  <FaTimes />
                </button>
              )}
            </header>
            <div className="poet-info-body modern-scrollbar">{children}</div>
          </motion.div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default PoetInfoDialog;
