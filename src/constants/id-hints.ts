/**
 * ID hints are linked to the Discord developer bot account.
 * Since we have separate dev and prod bot accounts, we need separate id hints.
 */

const devIdHints = {
  clearChat: "1382593420328960000",
  initBot: "1381884387972612129",
  startAddMembers: "1396765715939463250",
  startLoadQuestions: "1392070950526390283",
  startOrganizerCheckIn: "1392322993039867995",
  startPronouns: "1386121970944442559",
  startReport: "1386124055664525363",
  startTickets: "1386149185748861038",
  startTrivia: "1386423290645712967",
  startVerification: "1385475309876412540",
};

const prodIdHints = {
  clearChat: "",
  initBot: "",
  startAddMembers: "",
  startLoadQuestions: "",
  startOrganizerCheckIn: "",
  startPronouns: "",
  startReport: "",
  startTickets: "",
  startTrivia: "",
  startVerification: "",
};

export const idHints =
  process.env.NODE_ENV === "production" ? prodIdHints : devIdHints;
