import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconHeart } from "@/icons/FigIcons";
import ConfirmDialog from "@/components/ConfirmDialog";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsDialogOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDialogOpen(false);
      }
    };

    if (isDialogOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDialogOpen]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeToggle();
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToPlaylist();
    setIsDialogOpen(false);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveFromPlaylist();
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="track-actions-menu" ref={menuRef}>
        <button
          type="button"
          className="track-actions-trigger"
          onClick={(e) => {
            e.stopPropagation();
          }}
          aria-label="Действия с треком"
        >
          <span className="track-actions-like-btn" onClick={handleLikeClick}>
            <IconHeart filled={isLiked} />
          </span>
          <span className="track-actions-more-btn" onClick={(e) => {
            e.stopPropagation();
            setIsDialogOpen(true);
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="8" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="13" cy="8" r="1.5"/>
            </svg>
          </span>
        </button>
      </div>
      
      {isDialogOpen && createPortal(
        <ConfirmDialog
          isOpen={isDialogOpen}
          title="Действия с треком"
          message={`Выберите действие для трека "${trackTitle}"`}
          confirmText="Добавить в плейлист"
          cancelText="Отмена"
          onConfirm={() => handleAddClick({} as React.MouseEvent)}
          onCancel={() => setIsDialogOpen(false)}
          danger={false}
        />,
        document.body
      )}
    </>
  );
}
