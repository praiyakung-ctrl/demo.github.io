import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_GROUPS,
  assignUserToGroup,
  deleteGroup,
  groupForUser,
  hasPermission,
  membersOfGroup,
  removeAssignment,
  savedAssignments,
  savedGroups,
  saveGroup,
} from './groupStorage';
import type { User, UserGroup } from '../types';

const customGroup: UserGroup = {
  id: 'grp-maintenance',
  name: 'ช่างซ่อมบำรุง',
  description: 'ดูแผนที่และจัดการงานซ่อมกล้อง',
  isSystem: false,
  permissions: {
    map: ['view'], dashboard: [], portal: [], reports: [], liveViewer: [],
    adminCameras: [], adminUsers: [], adminRepairs: ['view', 'edit'], adminGroups: [], adminMenus: [],
    adminAuditLog: [], adminApi: [], adminNotifications: [], adminSettings: [], adminIncidents: [],
  },
};

describe('groupStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds the six system groups when storage is empty or invalid', () => {
    expect(savedGroups()).toHaveLength(6);
    localStorage.setItem('user_groups', '{broken');
    expect(savedGroups()).toEqual(DEFAULT_GROUPS);
  });

  it('saves a custom group alongside the system groups', () => {
    saveGroup(customGroup);
    const groups = savedGroups();
    expect(groups).toHaveLength(7);
    expect(groups.find(g => g.id === 'grp-maintenance')?.name).toBe('ช่างซ่อมบำรุง');
  });

  it('updates an existing group in place', () => {
    saveGroup(customGroup);
    saveGroup({ ...customGroup, description: 'แก้ไขแล้ว' });
    expect(savedGroups()).toHaveLength(7);
    expect(savedGroups().find(g => g.id === 'grp-maintenance')?.description).toBe('แก้ไขแล้ว');
  });

  it('deletes a custom group but refuses system groups', () => {
    saveGroup(customGroup);
    expect(deleteGroup('grp-maintenance')).toBe(true);
    expect(savedGroups()).toHaveLength(6);
    expect(deleteGroup('grp-admin')).toBe(false);
    expect(savedGroups()).toHaveLength(6);
  });

  it('groupForUser prefers groupId and falls back to the role group', () => {
    saveGroup(customGroup);
    expect(groupForUser({ role: 'operator', groupId: 'grp-maintenance' }).id).toBe('grp-maintenance');
    expect(groupForUser({ role: 'operator' }).id).toBe('grp-operator');
    expect(groupForUser({ role: 'operator', groupId: 'missing' }).id).toBe('grp-operator');
  });

  it('hasPermission: view is implied by any granted action', () => {
    saveGroup(customGroup);
    const g = savedGroups().find(x => x.id === 'grp-maintenance')!;
    expect(hasPermission(g, 'adminRepairs', 'view')).toBe(true);
    expect(hasPermission(g, 'adminRepairs', 'edit')).toBe(true);
    expect(hasPermission(g, 'adminRepairs', 'delete')).toBe(false);
    expect(hasPermission(g, 'dashboard', 'view')).toBe(false);
  });

  it('assignment CRUD and resolution priority: assignment > groupId > role', () => {
    localStorage.setItem('user_group_assignments', '{broken');
    expect(savedAssignments()).toEqual({});

    saveGroup(customGroup);
    assignUserToGroup('u2', 'grp-maintenance');
    expect(groupForUser({ id: 'u2', role: 'operator', groupId: 'grp-executive' }).id).toBe('grp-maintenance');

    removeAssignment('u2');
    expect(groupForUser({ id: 'u2', role: 'operator', groupId: 'grp-executive' }).id).toBe('grp-executive');
    expect(groupForUser({ id: 'u2', role: 'operator' }).id).toBe('grp-operator');
  });

  it('membersOfGroup separates role-default members from assigned ones', () => {
    saveGroup(customGroup);
    const users: User[] = [
      { id: 'u1', name: 'แอดมิน', username: 'admin', role: 'admin', email: 'a@a', isActive: true, nationalId: '1100200000001' },
      { id: 'u2', name: 'วิภา', username: 'operator', role: 'operator', email: 'b@b', isActive: true, nationalId: '1100200000002' },
    ];
    assignUserToGroup('u2', 'grp-maintenance');

    const maintenance = membersOfGroup('grp-maintenance', users);
    expect(maintenance).toHaveLength(1);
    expect(maintenance[0].user.id).toBe('u2');
    expect(maintenance[0].byAssignment).toBe(true);

    const adminMembers = membersOfGroup('grp-admin', users);
    expect(adminMembers).toHaveLength(1);
    expect(adminMembers[0].byAssignment).toBe(false);

    expect(membersOfGroup('grp-operator', users)).toHaveLength(0); // u2 moved away
  });

  it('permission edits on a system group persist', () => {
    const admin = savedGroups().find(g => g.id === 'grp-admin')!;
    saveGroup({ ...admin, permissions: { ...admin.permissions, adminCameras: ['view', 'edit'] } });
    const updated = savedGroups().find(g => g.id === 'grp-admin')!;
    expect(hasPermission(updated, 'adminCameras', 'delete')).toBe(false);
    expect(hasPermission(updated, 'adminCameras', 'edit')).toBe(true);
  });
});
