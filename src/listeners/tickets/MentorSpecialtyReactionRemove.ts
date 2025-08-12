import { MENTOR_SPECIALTIES_MAP, TicketDoc } from "@/types/db/ticket";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { MessageReaction, User } from "discord.js";

@ApplyOptions<Listener.Options>({
  event: Events.MessageReactionRemove,
})
class MentorSpecialtyReactionRemove extends Listener<
  typeof Events.MessageReactionRemove
> {
  public override async run(reaction: MessageReaction, user: User) {
    const guildId = reaction.message.guildId;
    if (!guildId) return;

    const guildDocRef = getGuildDocRef(guildId);
    const ticketsDocRef = guildDocRef.collection("command-data").doc("tickets");

    const ticketsDoc = await ticketsDocRef.get();
    if (!ticketsDoc.exists) return;

    const ticketDocData = ticketsDoc.data() as TicketDoc;
    const { savedMessages, extraSpecialties } = ticketDocData;

    // Only handle reactions on the mentor specialty selection message
    if (
      reaction.message.id !== savedMessages.mentorSpecialtySelection.messageId
    )
      return;

    const emojiName = reaction.emoji.name;
    if (!emojiName) return;

    const specialtyName =
      MENTOR_SPECIALTIES_MAP.get(emojiName) ?? extraSpecialties?.[emojiName];
    if (!specialtyName) return;

    const roleName = `M-${specialtyName}`;

    const member = reaction.message.guild?.members.cache.get(user.id);
    const role = reaction.message.guild?.roles.cache.find(
      (r) => r.name.toLowerCase() === roleName.toLowerCase(),
    );

    if (member && role) await member.roles.remove(role);
  }
}

export default MentorSpecialtyReactionRemove;
