import {
  APIInteractionGuildMember,
  Guild,
  GuildMember,
  GuildMemberRoleManager,
} from "discord.js";

/** Truncates text to `max` chars, adding an ellipsis when it overflows */
export const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/** Checks if the provided member has any of the given roles */
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

/** Fetches the message from the provided guild using given message and channel IDs */
export const getSavedMessage = async (
  guild: Guild,
  messageId: string,
  channelId: string,
) => {
  const channel = await guild.channels.fetch(channelId);
  if (!channel?.isTextBased()) return null;
  return channel.messages.fetch(messageId);
};
