import { checkMemberRoles } from "@/util/discord";
import { getGuildDocRef, GuildDoc } from "@/util/nwplus-firestore";

import { Precondition } from "@sapphire/framework";
import { ChatInputCommandInteraction } from "discord.js";

/**
 * A precondition that requires the user to have the admin or staff role to run the command.
 * Also enforces that the command is run in a server.
 */
class AdminRoleOnlyPrecondition extends Precondition {
  public override async chatInputRun(
    interaction: ChatInputCommandInteraction,
  ): Precondition.AsyncResult {
    if (!interaction.guildId) {
      return this.error({ message: "This command must be run in a server!" });
    }
    const guildDocRef = getGuildDocRef(interaction.guildId);
    const guildDoc = await guildDocRef.get();
    const data = guildDoc.data() as GuildDoc;
    if (!guildDoc.exists || !data?.setupComplete) {
      return this.error({
        message:
          "This server is not setup yet. Run /init-bot to setup the server.",
      });
    }

    const adminRole = data.roleIds.admin;
    const staffRole = data.roleIds.staff;
    if (!checkMemberRoles(interaction.member!, [adminRole, staffRole])) {
      return this.error({
        message: "Only admins and staff can use this command!",
      });
    }

    return this.ok();
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    AdminRoleOnly: never;
  }
}

export default AdminRoleOnlyPrecondition;
