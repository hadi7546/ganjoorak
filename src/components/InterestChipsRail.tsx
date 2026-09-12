"use client";

import React, { useMemo } from "react";
import { FaSlidersH } from "react-icons/fa";
import { orderInterestsForRail, type PoemInterest } from "@/data/interests";

interface InterestChipsRailProps {
  selectedKeys: string[];
  activeKey: string | null;
  onSelect: (key: string | null) => void;
  onOpenPicker: () => void;
  isLoading?: boolean;
}

const InterestChipsRail: React.FC<InterestChipsRailProps> = ({
  selectedKeys,
  activeKey,
  onSelect,
  onOpenPicker,
  isLoading = false,
}) => {
  const interests = useMemo<PoemInterest[]>(
    () => orderInterestsForRail(selectedKeys),
    [selectedKeys],
  );

  return (
    <div
      className={`interest-rail${isLoading ? " is-loading" : ""}`}
      role="tablist"
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
          role="tab"
          aria-selected={activeKey === null}
          className={`interest-chip${activeKey === null ? " is-active" : ""}`}
          onClick={() => onSelect(null)}
        >
          همه
        </button>
        {interests.map((interest) => {
          const isActive = activeKey === interest.key;
          return (
            <button
              type="button"
              key={interest.key}
              role="tab"
              aria-selected={isActive}
              className={`interest-chip${isActive ? " is-active" : ""}`}
              onClick={() => onSelect(isActive ? null : interest.key)}
            >
              <span className="interest-chip-emoji" aria-hidden="true">
                {interest.emoji}
              </span>
              {interest.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InterestChipsRail;
