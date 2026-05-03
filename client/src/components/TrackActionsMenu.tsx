import { useEffect, useRef, useState } from "react";
import { IconHeart } from "@/icons/FigIcons";

interface TrackActionsMenuProps {
  trackId: number;
  trackTitle: string;
  isLiked: boolean;
  onLikeToggle: () => void;
  onAddToPlaylist: () => void;
  onRemoveFromPlaylist: () => void;
  onDeletePlaylist?: () => void;
  showRemoveOption?: boolean;
  showDeletePlaylistOption?: boolean;
}

export default function TrackActionsMenu({
  trackId,
  trackTitle,
  isLiked,
  onLikeToggle,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onDeletePlaylist,
  showRemoveOption = false,
  showDeletePlaylistOption = false,
}: TrackActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeToggle();
    setIsOpen(false);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToPlaylist();
    setIsOpen(false);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveFromPlaylist();
    setIsOpen(false);
  };

  return (
    <div className="track-actions-menu" ref={menuRef}>
      <button
        type="button"
        className="track-actions-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="Действия с треком"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="track-actions-like-btn" onClick={handleLikeClick}>
          <IconHeart filled={isLiked} />
        </span>
        <span className="track-actions-more-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="3" cy="8" r="1.5"/>
            <circle cx="8" cy="8" r="1.5"/>
            <circle cx="13" cy="8" r="1.5"/>
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="track-actions-dropdown glass">
          <button
            type="button"
            className="track-actions-item"
            onClick={handleAddClick}
          >
            Добавить в плейлист
          </button>
          {showRemoveOption && (
            <button
              type="button"
              className="track-actions-item danger"
              onClick={handleRemoveClick}
            >
              Удалить из плейлиста
            </button>
          )}
          {showDeletePlaylistOption && (
            <button
              type="button"
              className="track-actions-item danger"
              onClick={() => {
                e.stopPropagation();
                onDeletePlaylist?.();
              }}
            >
              Удалить плейлист
            </button>
          )}
        </div>
      )}
    </div>
  );
}
