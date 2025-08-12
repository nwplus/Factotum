/**
 * ID hints are linked to the Discord developer bot account.
 * Since we have separate dev and prod bot accounts, we need separate id hints.
 */

const devIdHints = {
  clearChat: "1402483606294630420",
  initBot: "1381884387972612129",
  startAddMembers: "1402483614603542649",
  startLoadQuestions: "1402483616302366791",
  startOrganizerCheckIn: "1402483603123863672",
  startPronouns: "1386121970944442559",
  startReport: "1402483690331705406",
  startTickets: "1402483611156086924",
  startTrivia: "1386423290645712967",
  startVerification: "1385475309876412540",
};

const prodIdHints = {
  clearChat: "1051737346720137246",
  initBot: "1051737348502728764",
  startAddMembers: "1402484807379714088",
  startLoadQuestions: "1402484809653162086",
  startOrganizerCheckIn: "1402484796579643433",
  startPronouns: "1402484814208045240",
  startReport: "1214159059880517652",
  startTickets: "1402484799821578270",
  startTrivia: "1402484818427514910",
  startVerification: "1060545714133938309",
};

export const idHints =
  process.env.NODE_ENV === "production" ? prodIdHints : devIdHints;
