import { PRONOUN_REACTION_EMOJIS, PronounsDoc } from "@/types/db/pronouns";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { MessageReaction, User } from "discord.js";

@ApplyOptions<Listener.Options>({
  event: Events.MessageReactionRemove,
})
class PronounsReactionRemove extends Listener<
  typeof Events.MessageReactionRemove
> {
  public override async run(reaction: MessageReaction, user: User) {
    const guildDocRef = getGuildDocRef(reaction.message.guildId!);
    const pronounsDocRef = guildDocRef
      .collection("command-data")
      .doc("pronouns");

    const pronounsDoc = await pronounsDocRef.get();
    if (!pronounsDoc.exists) return;

    const pronounsDocData = pronounsDoc.data() as PronounsDoc;

    const { savedMessage } = pronounsDocData;
    if (reaction.message.id !== savedMessage.messageId) return;

    const { heHimRole, sheHerRole, theyThemRole, otherRole } =
      pronounsDocData.roleIds;

    const roleOrder = [heHimRole, sheHerRole, theyThemRole, otherRole];

    const roleIndex = PRONOUN_REACTION_EMOJIS.findIndex(
      (emoji) => emoji === reaction.emoji.name,
    );
    if (roleIndex === -1) return;

    const member = reaction.message.guild?.members.cache.get(user.id);
    if (member) await member.roles.remove(roleOrder[roleIndex]);
  }
}

export default PronounsReactionRemove;
