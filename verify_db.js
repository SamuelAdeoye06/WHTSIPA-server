import mongoose from 'mongoose'
import Ticket from './models/ticket.model.js'
import User from './models/user.model.js'
import Report from './models/report.model.js'
import Contact from './models/contact.model.js'
import dotenv from 'dotenv'

dotenv.config()

async function run() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to DB')

  const usersCount = await User.countDocuments()
  console.log('Users count:', usersCount)

  const ticketsCount = await Ticket.countDocuments()
  console.log('Tickets count:', ticketsCount)

  const reportsCount = await Report.countDocuments()
  console.log('Reports count:', reportsCount)

  const contactsCount = await Contact.countDocuments()
  console.log('Contacts count:', contactsCount)

  if (usersCount > 0) {
    const latestUsers = await User.find().sort({ createdAt: -1 }).limit(5)
    console.log('Latest Users:')
    latestUsers.forEach(u => console.log(`- ${u.firstName} ${u.lastName} (${u.email}) - Verified: ${u.isVerified} - Token: ${u.verifyToken} - Role: ${u.role}`))
  }

  if (ticketsCount > 0) {
    const latestTickets = await Ticket.find().sort({ createdAt: -1 }).limit(5)
    console.log('Latest Tickets:')
    latestTickets.forEach(t => console.log(`- ${t.ticketId} [${t.type}] - Summary: ${t.summary} - Contact: ${t.name} (${t.email})`))
  }

  await mongoose.disconnect()
}

run().catch(console.error)
