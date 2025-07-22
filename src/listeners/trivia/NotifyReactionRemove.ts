import { TriviaDoc } from "@/types/db/trivia";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { MessageReaction, User } from "discord.js";

@ApplyOptions<Listener.Options>({
  event: Events.MessageReactionRemove,
})
class NotifyReactionRemove extends Listener<
  typeof Events.MessageReactionRemove
> {
  public override async run(reaction: MessageReaction, user: User) {
    const guildDocRef = getGuildDocRef(reaction.message.guildId!);
    const triviaDocRef = guildDocRef.collection("command-data").doc("trivia");

    const triviaDoc = await triviaDocRef.get();
    if (!triviaDoc.exists) return;

    const triviaDocData = triviaDoc.data() as TriviaDoc;
    const { roleIds, savedMessages } = triviaDocData;

    if (reaction.message.id !== savedMessages.triviaInfoMessage.messageId)
      return;

    if (reaction.emoji.name !== "🍀") return;

    const member = reaction.message.guild?.members.cache.get(user.id);
    if (member) await member.roles.remove(roleIds.notify);
  }
}

export default NotifyReactionRemove;
