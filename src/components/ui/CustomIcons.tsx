import React from 'react';

export const TwoDotsVertical: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="8.1" r="1.8" />
        <circle cx="12" cy="15.9" r="1.8" />
    </svg>
);

export const InfoFilled: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10.7 17V11H13.3V17H10.7ZM10.7 9V7H13.3V9H10.7Z" />
    </svg>
);

/**
 * Zwei Striche — das globale Menue.
 *
 * Die Unterscheidung ist bewusst: Drei Punkte stehen fuer Aktionen AN EINEM
 * Gegenstand (dieses Bild, dieser Stapel), zwei Striche fuer alles, was die
 * ganze Anwendung betrifft (Einstellungen, Konto, Abmelden). Vorher trugen
 * beide dasselbe Symbol, und man musste raten, worauf sich ein Menue bezieht.
 *
 * Zwei statt drei Strichen: Ein Hamburger mit drei Balken ist in einer Leiste
 * mit lauter runden Symbolen das lauteste Element. Zwei Striche sagen dasselbe
 * und bleiben ruhig.
 *
 * Beide gleich lang. Ein verkuerzter unterer Strich sollte das Symbol
 * auflockern, liess es aber schief aussehen — bei nur zwei Linien gibt es
 * nichts, worauf sich die Verkuerzung beziehen koennte, und sie wirkt wie ein
 * Fehler statt wie eine Form.
 */
export const MenuLines: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M5 9.5h14" />
        <path d="M5 14.5h14" />
    </svg>
);
