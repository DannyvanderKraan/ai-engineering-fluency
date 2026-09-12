/**
 * Which group tab each of the Usage Analysis leaf tabs lives under.
 *
 * The view reached nine tabs in one strip, which wrapped onto a second row at ordinary panel
 * widths and offered no way to tell at a glance that "Repository PRs" and "Cloud Agent" are the
 * same kind of thing. This mirrors the two-level strip the Diagnostics view already uses.
 *
 * **Leaf tab ids are unchanged and must stay that way.** They are the `viewTabOpened` telemetry
 * key, the persisted `activeTab`, the `switchTab` message payload, and the target of the What's
 * New view's "Take me there" deep links. Grouping them is chrome; renaming them is a migration.
 */

/** A group tab: the id used in `data-group`, its label, and the leaf tabs it owns, in order. */
export interface UsageTabGroup {
	id: string;
	label: string;
	/** Codicon name without the `codicon-` prefix. */
	icon: string;
	tabs: string[];
}

export const USAGE_TAB_GROUPS: readonly UsageTabGroup[] = [
	{ id: 'usage', label: 'Usage', icon: 'graph', tabs: ['activity', 'sessions'] },
	{ id: 'workspace', label: 'Workspace', icon: 'folder-opened', tabs: ['tools', 'health', 'worktrees'] },
	{ id: 'github', label: 'GitHub', icon: 'github', tabs: ['repos', 'agent'] },
	{ id: 'coaching', label: 'Coaching', icon: 'mortar-board', tabs: ['insights', 'corrections'] },
];

/** The group that owns `tabId`, falling back to the first group for an unknown tab. */
export function groupOfUsageTab(tabId: string): string {
	for (const group of USAGE_TAB_GROUPS) {
		if (group.tabs.includes(tabId)) { return group.id; }
	}
	return USAGE_TAB_GROUPS[0].id;
}

/** Every leaf tab id, in strip order. */
export function allUsageTabs(): string[] {
	return USAGE_TAB_GROUPS.flatMap(group => group.tabs);
}
