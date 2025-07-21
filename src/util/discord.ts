import {
  APIInteractionGuildMember,
  Guild,
  GuildMember,
  GuildMemberRoleManager,
} from "discord.js";

export const checkMemberRoles = (
  member: GuildMember | APIInteractionGuildMember,
  rolesToCheck: string[],
) => {
  return rolesToCheck.some((role) => {
    const memberRoles = member.roles;
    if (memberRoles instanceof GuildMemberRoleManager) {
      return memberRoles.cache.has(role);
    }
    return memberRoles.includes(role);
  });
};

export const getSavedMessage = async (
  guild: Guild,
  messageId: string,
  channelId: string,
) => {
  const channel = await guild.channels.fetch(channelId);
  if (!channel?.isTextBased()) return null;
  return channel.messages.fetch(messageId);
};
