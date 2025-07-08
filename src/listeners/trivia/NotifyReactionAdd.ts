import { getGuildDocRef, TriviaDoc } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { MessageReaction, User } from "discord.js";

@ApplyOptions<Listener.Options>({
  event: Events.MessageReactionAdd,
})
class TriviaReactionAdd extends Listener<typeof Events.MessageReactionAdd> {
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
    if (member) await member.roles.add(roleIds.notify);
  }
}

export default TriviaReactionAdd;
