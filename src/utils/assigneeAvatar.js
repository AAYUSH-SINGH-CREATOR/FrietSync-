const getId = (person) => person?.userId || person?.id || person?._id || person?.user?.userId || person?.user?.id || person?.user?._id || '';

export const getProfileImage = (person) => person?.profilePictureUrl
  || person?.user?.profilePictureUrl
  || person?.profilePicture
  || person?.user?.profilePicture
  || person?.profileUrl
  || person?.user?.profileUrl
  || person?.avatarUrl
  || person?.user?.avatarUrl
  || person?.avatar
  || person?.user?.avatar
  || person?.profileImageUrl
  || person?.imageUrl
  || person?.pictureUrl
  || person?.photoUrl
  || '';

export const getAssigneeAvatarUrl = (record, members = []) => {
  if (!record) return '';
  const candidates = [
    record.contributor,
    record.assignedTo,
    record.assignee,
    ...(Array.isArray(record.assignees) ? record.assignees : []),
    ...(Array.isArray(record.assigneeIds) ? record.assigneeIds.map((userId) => ({ userId })) : []),
    ...(Array.isArray(record.assignedUserIds) ? record.assignedUserIds.map((userId) => ({ userId })) : []),
    { userId: record.assignedContributorId },
    { userId: record.contributorId },
    { userId: record.assigneeId },
    { userId: record.assignedToId },
  ].filter(Boolean);

  for (const person of candidates) {
    const image = getProfileImage(person);
    if (image) return image;
  }

  const candidateIds = new Set(candidates.map(getId).filter(Boolean).map(String));
  const candidateEmails = new Set(candidates.map((person) => String(person?.email || person?.user?.email || '').toLowerCase()).filter(Boolean));
  const matchedMember = members.find((member) => {
    const memberIds = [getId(member), getId(member?.user)].filter(Boolean).map(String);
    const memberEmail = String(member?.email || member?.user?.email || '').toLowerCase();
    return memberIds.some((id) => candidateIds.has(id)) || (memberEmail && candidateEmails.has(memberEmail));
  });

  return getProfileImage(matchedMember);
};
