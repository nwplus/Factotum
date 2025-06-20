import {
  APIInteractionGuildMember,
  GuildMember,
  GuildMemberRoleManager,
} from "discord.js";

export const checkMemberRoles = (
  member: GuildMember | APIInteractionGuildMember,
  rolesToCheck: string[],
) => {
  return rolesToCheck.every((role) => {
    const memberRoles = member.roles;
    if (memberRoles instanceof GuildMemberRoleManager) {
      return memberRoles.cache.has(role);
    }
    return memberRoles.includes(role);
  });
};
