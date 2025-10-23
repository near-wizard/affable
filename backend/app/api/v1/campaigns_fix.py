# Temporary fix file - need to update campaigns.py to eager load current_version

# Change this line (around line 8):
# from sqlalchemy.orm import Session
# To:
# from sqlalchemy.orm import Session, selectinload

# Change these lines (around lines 94-98):
#     # Get total count
#     total = query.count()
#     
#     # Paginate
#     campaigns = query.offset((page - 1) * page_size).limit(page_size).all()
# To:
#     # Get total count
#     total = query.count()
#     
#     # Paginate and eager load the current_version relationship
#     campaigns = query.options(selectinload(Campaign.current_version)).offset((page - 1) * page_size).limit(page_size).all()
