"use client";

import React, { useMemo } from "react";
import { FaSlidersH } from "react-icons/fa";
import { orderInterestsForRail, type PoemInterest } from "@/data/interests";

interface InterestChipsRailProps {
  selectedKeys: string[];
  activeKeys: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
  onOpenPicker: () => void;
  isLoading?: boolean;
}

const InterestChipsRail: React.FC<InterestChipsRailProps> = ({
  selectedKeys,
  activeKeys,
  onToggle,
  onClear,
  onOpenPicker,
  isLoading = false,
}) => {
  const interests = useMemo<PoemInterest[]>(
    () => orderInterestsForRail(selectedKeys),
    [selectedKeys],
  );
  const activeKeySet = useMemo(() => new Set(activeKeys), [activeKeys]);
  const hasActive = activeKeySet.size > 0;

  return (
    <div
      className={`interest-rail${isLoading ? " is-loading" : ""}`}
      role="group"
      aria-label="دسته‌بندی شعرها"
      dir="rtl"
    >
      <button
        type="button"
        className="interest-rail-settings"
        onClick={onOpenPicker}
        aria-label="ویرایش علاقه‌مندی‌ها"
        title="ویرایش علاقه‌مندی‌ها"
      >
        <FaSlidersH aria-hidden="true" />
      </button>
      <div className="interest-rail-track">
        <button
          type="button"
          className={`interest-chip${hasActive ? "" : " is-active"}`}
          onClick={onClear}
          aria-pressed={!hasActive}
        >
          همه
        </button>
        {interests.map((interest) => {
          const isActive = activeKeySet.has(interest.key);
          return (
            <button
              type="button"
              key={interest.key}
              className={`interest-chip${isActive ? " is-active" : ""}`}
              onClick={() => onToggle(interest.key)}
              aria-pressed={isActive}
            >
              {interest.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InterestChipsRail;
