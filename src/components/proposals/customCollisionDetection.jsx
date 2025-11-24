/**
 * Custom Collision Detection for dnd-kit
 * 
 * Solves the off-screen column drop problem by calculating collision based on:
 * - Scroll container offset
 * - Column positions in the scrollable area
 * - Mouse coordinates relative to the scroll container
 * 
 * This allows dropping into columns that are not currently visible in the viewport.
 */

import { getFirstCollision, pointerWithin, rectIntersection } from '@dnd-kit/core';

/**
 * Custom collision detection strategy that accounts for scroll offset
 * @param {Object} args - dnd-kit collision detection arguments
 * @returns {Array} - Array of collision entries
 */
export function customCollisionDetection(args) {
  const { droppableContainers, droppableRects, active, pointerCoordinates, collisionRect } = args;

  // First, try standard pointer-based collision for visible elements
  const pointerCollisions = pointerWithin(args);
  
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // If no pointer collisions, calculate based on scroll position and column boundaries
  // This handles off-screen columns
  const collisions = [];

  droppableContainers.forEach((container) => {
    const { id, disabled } = container;
    
    if (disabled) return;

    const rect = droppableRects.get(id);
    if (!rect) return;

    // Calculate if the pointer would be over this droppable if it were visible
    // by checking scroll-adjusted boundaries
    const scrollContainer = document.querySelector('.overflow-x-auto');
    if (scrollContainer) {
      const scrollLeft = scrollContainer.scrollLeft;
      const containerRect = scrollContainer.getBoundingClientRect();
      
      // Adjust rect position based on scroll
      const adjustedLeft = rect.left - containerRect.left + scrollLeft;
      const adjustedRight = adjustedLeft + rect.width;
      const pointerX = pointerCoordinates.x - containerRect.left + scrollLeft;
      
      // Check if pointer is within column boundaries (accounting for scroll)
      if (pointerX >= adjustedLeft && pointerX <= adjustedRight) {
        // Calculate distance for priority
        const centerX = adjustedLeft + rect.width / 2;
        const distance = Math.abs(pointerX - centerX);
        
        collisions.push({
          id,
          data: { droppableContainer: container, value: distance }
        });
      }
    }
  });

  // Sort by closest distance
  collisions.sort((a, b) => a.data.value - b.data.value);

  return collisions.length > 0 ? collisions : rectIntersection(args);
}

/**
 * Fallback collision detection if custom strategy fails
 */
export function safeCollisionDetection(args) {
  try {
    return customCollisionDetection(args);
  } catch (error) {
    console.error('[dnd-kit] Collision detection error:', error);
    // Fallback to standard rectangle intersection
    return rectIntersection(args);
  }
}