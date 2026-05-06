"use client";

import AccordionItem from "@/components/AccordionItem";
import type { Update } from "@/data/updates";

interface UpdateAccordionItemProps {
  update: Update;
  defaultOpen?: boolean;
}

const UpdateAccordionItem = ({
  update,
  defaultOpen = false,
}: UpdateAccordionItemProps) => {
  const { version, date, changes, video, image } = update;

  return (
    <AccordionItem
      defaultOpen={defaultOpen}
      containerClassName="update-item"
      questionClassName="update-question"
      answerClassName="update-answer"
      titleTag="div"
      title={
        <div className="update-header">
          <h3 className="update-version">نسخه {version}</h3>
          <span className="update-date">{date}</span>
        </div>
      }
    >
      <div className="update-content">
        <ul className="update-changes">
          {changes.map((change, changeIndex) => (
            <li key={changeIndex}>{change}</li>
          ))}
        </ul>
        {video && (
          <div className="update-media">
            <video className="update-video" controls preload="metadata">
              <source src={video} type="video/mp4" />
              مرورگر شما از ویدیو پشتیبانی نمی‌کند.
            </video>
          </div>
        )}
        {image && (
          <div className="update-media">
            <img
              className="update-image"
              src={image}
              alt={`عکس نسخه ${version}`}
            />
          </div>
        )}
      </div>
    </AccordionItem>
  );
};

export default UpdateAccordionItem;
