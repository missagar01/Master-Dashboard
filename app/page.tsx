"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Play, ArrowLeft, ExternalLink, Table2, FileText, Sheet, Sparkles, Lock } from "lucide-react"
import Image from "next/image"
import logo from "@/public/Screenshot_2025-08-13_at_1.45.14_PM-removebg-preview.png"

interface System {
  sno: number
  systemName: string
  appLink: string
  sheetLink: string
  status: "Complete" | "Running" | "Pending"
  remarks?: string
}

interface User {
  userId: string
  password: string
  userType: "admin" | "user"
  appAccess: string
}

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-red-600 via-orange-600 to-red-700 text-white py-3 sm:py-4 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-medium">
            Powered by{" "}
            <a
              href="https://botivate.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-orange-200 underline underline-offset-2 hover:underline-offset-4 transition-all duration-300 font-semibold"
            >
              Botivate
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function MasterDashboard() {
  const [currentView, setCurrentView] = useState<"login" | "main" | "complete" | "running">("login")
  const [systemsData, setSystemsData] = useState<{
    complete: System[]
    running: System[]
  }>({ complete: [], running: [] })
  const [loading, setLoading] = useState(false)
  const [loginData, setLoginData] = useState({ userId: "", password: "" })
  const [loginError, setLoginError] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Check for saved user data on component mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem("currentUser")
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setCurrentView("main")
        fetchSystemsData(user)
      } catch (error) {
        console.error("Error parsing saved user data:", error)
        sessionStorage.removeItem("currentUser")
      }
    }
    setIsInitialized(true)
  }, [])

  // Fetch login data from Google Sheets
  const fetchLoginData = async (): Promise<User[]> => {
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbxp16KESUsNMtAmHbei7V4ckoTWMFtB1eJng_hsJF5SQ3Ao-MQeooiHNXCcVSYO-9KFTA/exec?sheet=Login",
      )
      const data = await response.json()

      if (data.success && data.data) {
        // Skip header row and map the data
        return data.data.slice(1).map((row: any[]) => ({
          userId: row[0] || "",
          password: row[1] || "",
          userType: row[2] || "user",
          appAccess: row[3] || "",
        }))
      }
      return []
    } catch (error) {
      console.error("Error fetching login data:", error)
      return []
    }
  }

  // Handle login
  const handleLogin = async () => {
    if (!loginData.userId || !loginData.password) {
      setLoginError("Please enter both User ID and Password")
      return
    }

    setLoading(true)
    setLoginError("")

    try {
      const users = await fetchLoginData()
      const user = users.find((u) => u.userId === loginData.userId && u.password === loginData.password)

      if (user) {
        setCurrentUser(user)
        setCurrentView("main")
        // Save user data to session storage
        sessionStorage.setItem("currentUser", JSON.stringify(user))
        // Fetch systems data after successful login
        await fetchSystemsData(user)
      } else {
        setLoginError("Invalid User ID or Password")
      }
    } catch (error) {
      setLoginError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Fetch systems data based on user access
  const fetchSystemsData = async (user: User) => {
    try {
      setLoading(true)
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbxp16KESUsNMtAmHbei7V4ckoTWMFtB1eJng_hsJF5SQ3Ao-MQeooiHNXCcVSYO-9KFTA/exec?sheet=All%20Systems",
      )
      const data = await response.json()

      if (data.success && data.data) {
        // Skip header row and map the data
        let rows = data.data.slice(1).map((row: any[], index: number) => ({
          sno: index + 1,
          systemName: row[1] || "",
          appLink: row[2] || "",
          sheetLink: row[3] || "",
          status: row[4] || "",
          remarks: row[5] || "",
        }))

        // Filter systems based on user access - FIXED LOGIC
        if (user.userType === "user" && user.appAccess) {
          console.log("User app access:", user.appAccess)
          console.log(
            "Available systems:",
            rows.map((r) => r.systemName),
          )

          // Split the app access by comma and clean up whitespace
          const accessibleApps = user.appAccess
            .split(",")
            .map((app) => app.trim().toLowerCase())
            .filter((app) => app.length > 0) // Remove empty strings

          console.log("Accessible apps:", accessibleApps)

          // Filter systems where system name matches any of the accessible apps
          rows = rows.filter((system: System) => {
            const systemNameLower = system.systemName.toLowerCase()
            const isAccessible = accessibleApps.some((app) => {
              // Check if the app name is contained in the system name or vice versa
              return systemNameLower.includes(app) || app.includes(systemNameLower)
            })

            if (isAccessible) {
              console.log(`System "${system.systemName}" is accessible`)
            }

            return isAccessible
          })

          console.log(
            "Filtered systems:",
            rows.map((r) => r.systemName),
          )
        }

        // Filter systems based on status
        const completeSystems = rows.filter(
          (system: System) => system.status === "Complete" || system.status === "Completed",
        )
        const runningSystems = rows.filter(
          (system: System) => system.status === "Running" || system.status === "Pending",
        )

        console.log("Complete systems:", completeSystems.length)
        console.log("Running systems:", runningSystems.length)

        setSystemsData({
          complete: completeSystems,
          running: runningSystems,
        })
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSectionClick = (section: "complete" | "running") => {
    // Only allow running section for admin users
    if (section === "running" && currentUser?.userType !== "admin") {
      return
    }
    setCurrentView(section)
  }

  const handleBack = () => {
    setCurrentView("main")
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentView("login")
    setLoginData({ userId: "", password: "" })
    setSystemsData({ complete: [], running: [] })
    // Remove user data from session storage
    sessionStorage.removeItem("currentUser")
  }

  const renderLoginPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center py-4 px-4 sm:py-8 sm:px-6 lg:px-8">
        <Card className="w-full max-w-sm sm:max-w-md mx-auto shadow-2xl border-0">
          <CardHeader className="text-center space-y-4 pb-6 sm:pb-8 px-4 sm:px-6">
            <div className="flex items-center justify-center space-x-3">
              <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-700 bg-clip-text text-transparent">
                Admin Login
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">Enter your credentials to access the dashboard</p>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-sm font-medium">
                  User ID
                </Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="Enter your user ID"
                  value={loginData.userId}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, userId: e.target.value }))}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  className="h-10 sm:h-11"
                />
              </div>
            </div>

            {loginError && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">
                {loginError}
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 h-10 sm:h-11 text-sm sm:text-base font-medium"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )

  const renderMainDashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 flex flex-col">
      <div className="flex-1 py-4 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6 sm:space-y-8 lg:space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 px-4 sm:px-6 lg:px-8">
              {/* Logo in top left */}
              <div className="flex-shrink-0 flex items-center order-1 sm:order-1">
                <Image
                  src={logo}
                  alt="SAGAR PIPES"
                  width={200}
                  height={100}
                  className="h-20 w-60 sm:h-20 lg:h-24 object-contain"
                  priority
                />
              </div>

              {/* Logout button - mobile top right, desktop top right */}
              <div className="flex-shrink-0 order-2 sm:order-3 self-end sm:self-start">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm hover:bg-white text-sm sm:text-base px-3 sm:px-4 py-2"
                >
                  Logout
                </Button>
              </div>

              {/* Main title section - centered on desktop, full width on mobile */}
              <div className="text-center space-y-3 sm:space-y-4 flex-1 px-2 sm:px-4 order-3 sm:order-2 w-full sm:w-auto">
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                  <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-red-600 animate-pulse" />
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-700 bg-clip-text text-transparent">
                    SAGAR PIPES
                  </h1>
                  <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-orange-600 animate-pulse" />
                </div>
                <p className="text-muted-foreground text-sm sm:text-lg lg:text-xl xl:text-2xl font-medium px-2">
                  Welcome, {currentUser?.userType === "admin" ? "Admin" : "User"} ({currentUser?.userId}) - Choose a
                  section to explore your systems
                </p>
                {currentUser?.userType === "user" && (
                  <p className="text-xs sm:text-sm text-muted-foreground px-2">
                    Access granted to: {currentUser?.appAccess || "No specific access defined"}
                  </p>
                )}
                <div className="flex items-center justify-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{systemsData.complete.length} Complete</span>
                  </div>
                  {currentUser?.userType === "admin" && (
                    <>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
                        <span>{systemsData.running.length} Running</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-48 sm:h-64">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 ${currentUser?.userType === "admin" ? "lg:grid-cols-2" : ""} gap-6 sm:gap-8 lg:gap-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto`}
              >
                {/* Complete Section */}
                <Card
                  className="cursor-pointer hover:scale-[1.02] sm:hover:scale-[1.03] active:scale-[0.98] sm:active:scale-[0.97] transition-all duration-500 border-0 shadow-xl sm:shadow-2xl hover:shadow-2xl sm:hover:shadow-3xl group overflow-hidden"
                  onClick={() => handleSectionClick("complete")}
                >
                  <CardContent className="p-6 sm:p-8 lg:p-10 xl:p-12 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-white relative min-h-[280px] sm:min-h-[320px]">
                    <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full -translate-y-16 sm:-translate-y-20 translate-x-16 sm:translate-x-20 group-hover:scale-110 transition-transform duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full translate-y-12 sm:translate-y-16 -translate-x-12 sm:-translate-x-16 group-hover:scale-110 transition-transform duration-700"></div>
                    <div className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-24 sm:h-24 bg-white/5 rounded-full -translate-x-10 sm:-translate-x-12 -translate-y-10 sm:-translate-y-12 group-hover:rotate-180 transition-transform duration-1000"></div>

                    <div className="relative z-10 text-center space-y-4 sm:space-y-6 flex flex-col justify-center h-full">
                      <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-lg">
                        <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 drop-shadow-lg" />
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 drop-shadow-lg">
                          Complete
                        </h2>
                        <div className="space-y-2">
                          <Badge className="bg-white/20 text-white border-white/30 text-sm sm:text-base px-3 sm:px-4 py-1">
                            {systemsData.complete.length} Systems
                          </Badge>
                          <p className="text-white/90 text-sm sm:text-base lg:text-lg font-medium">
                            Finished & Deployed
                          </p>
                          <p className="text-white/80 text-xs sm:text-sm lg:text-base px-2">
                            View all completed projects and systems
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Running Section - Only for Admin */}
                {currentUser?.userType === "admin" && (
                  <Card
                    className="cursor-pointer hover:scale-[1.02] sm:hover:scale-[1.03] active:scale-[0.98] sm:active:scale-[0.97] transition-all duration-500 border-0 shadow-xl sm:shadow-2xl hover:shadow-2xl sm:hover:shadow-3xl group overflow-hidden"
                    onClick={() => handleSectionClick("running")}
                  >
                    <CardContent className="p-6 sm:p-8 lg:p-10 xl:p-12 bg-gradient-to-br from-red-500 via-orange-500 to-red-600 text-white relative min-h-[280px] sm:min-h-[320px]">
                      <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full -translate-y-16 sm:-translate-y-20 translate-x-16 sm:translate-x-20 group-hover:scale-110 transition-transform duration-700"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full translate-y-12 sm:translate-y-16 -translate-x-12 sm:-translate-x-16 group-hover:scale-110 transition-transform duration-700"></div>
                      <div className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-24 sm:h-24 bg-white/5 rounded-full -translate-x-10 sm:-translate-x-12 -translate-y-10 sm:-translate-y-12 group-hover:rotate-180 transition-transform duration-1000"></div>

                      <div className="relative z-10 text-center space-y-4 sm:space-y-6 flex flex-col justify-center h-full">
                        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-lg">
                          <Play className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 drop-shadow-lg" />
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 drop-shadow-lg">
                            Running
                          </h2>
                          <div className="space-y-2">
                            <Badge className="bg-white/20 text-white border-white/30 text-sm sm:text-base px-3 sm:px-4 py-1">
                              {systemsData.running.length} Systems
                            </Badge>
                            <p className="text-white/90 text-sm sm:text-base lg:text-lg font-medium">
                              Active & In Progress
                            </p>
                            <p className="text-white/80 text-xs sm:text-sm lg:text-base px-2">
                              Monitor ongoing projects and systems
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )

  const renderSystemTable = (section: "complete" | "running") => {
    const data = systemsData[section]
    const isRunning = section === "running"
    const sectionTitle = section === "complete" ? "Complete Systems" : "Running Systems"
    const sectionColor = section === "complete" ? "from-emerald-500 to-teal-600" : "from-red-500 to-orange-600"
    const iconColor = section === "complete" ? "text-emerald-600" : "text-red-600"
    const bgColor = section === "complete" ? "from-emerald-50 to-teal-50" : "from-red-50 to-orange-50"

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 flex flex-col">
        <div className="flex-1 py-4 sm:py-8 lg:py-12">
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-300 px-3 sm:px-4 py-2"
                size="default"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>

              <div className="flex items-center space-x-3 sm:space-x-4">
                <Badge
                  className={`bg-gradient-to-r ${sectionColor} text-white px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium shadow-lg`}
                >
                  {data.length} Systems
                </Badge>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm px-2 sm:px-3 bg-transparent"
                >
                  Logout
                </Button>
              </div>
            </div>

            <div className="text-center space-y-3 sm:space-y-4 px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className={`p-3 sm:p-4 bg-gradient-to-r ${sectionColor} rounded-xl shadow-lg`}>
                  {section === "complete" ? (
                    <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
                  ) : (
                    <Play className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {sectionTitle}
                </h1>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg px-2">
                {section === "complete"
                  ? "All completed and deployed systems"
                  : "Currently active and in-development systems"}
              </p>
            </div>

            <div className="px-4 sm:px-6 lg:px-8">
              <Card className={`shadow-xl sm:shadow-2xl border-0 bg-gradient-to-br ${bgColor}`}>
                <CardHeader className="bg-white/80 backdrop-blur-sm p-4 sm:p-6">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <Table2 className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
                      <span className="text-lg sm:text-xl font-bold">Systems Overview</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 self-start sm:self-center"
                    >
                      {data.length} Total
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center items-center h-48 sm:h-64">
                      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                  ) : data.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-48 sm:h-64 text-gray-500 px-4">
                      <Table2 className="h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-50" />
                      <p className="text-base sm:text-lg font-semibold text-center">No systems found</p>
                      <p className="text-xs sm:text-sm text-center mt-2">
                        {currentUser?.userType === "user"
                          ? "You don't have access to any systems in this category"
                          : "No systems available in this category"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-white/60 hover:bg-white/60 border-b-2">
                            <TableHead className="font-bold text-gray-800 text-center w-16 sm:w-20 text-sm sm:text-base px-2 sm:px-4">
                              SNo.
                            </TableHead>
                            <TableHead className="font-bold text-gray-800 min-w-[200px] sm:min-w-[250px] text-sm sm:text-base px-2 sm:px-4">
                              System Name
                            </TableHead>
                            <TableHead className="font-bold text-gray-800 min-w-[140px] sm:min-w-[180px] text-sm sm:text-base px-2 sm:px-4">
                              App Link
                            </TableHead>
                            {currentUser?.userType !== "user" && (
                              <TableHead className="font-bold text-gray-800 min-w-[140px] sm:min-w-[180px] text-sm sm:text-base px-2 sm:px-4">
                                Sheet Link
                              </TableHead>
                            )}
                            {isRunning && (
                              <TableHead className="font-bold text-gray-800 min-w-[250px] sm:min-w-[300px] text-sm sm:text-base px-2 sm:px-4">
                                Remarks
                              </TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.map((system, index) => (
                            <TableRow
                              key={index}
                              className="hover:bg-white/70 transition-all duration-300 border-b border-white/50"
                            >
                              <TableCell className="text-center font-bold text-base sm:text-lg text-gray-700 bg-white/30 px-2 sm:px-4 py-3 sm:py-4">
                                {system.sno}
                              </TableCell>
                              <TableCell className="font-semibold px-2 sm:px-4 py-3 sm:py-4">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                  <div
                                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r ${sectionColor} shadow-sm flex-shrink-0`}
                                  ></div>
                                  <span className="text-gray-800 text-sm sm:text-base break-words">
                                    {system.systemName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="px-2 sm:px-4 py-3 sm:py-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                  className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 font-medium shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 w-full sm:w-auto"
                                >
                                  <a
                                    href={system.appLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center space-x-1 sm:space-x-2 min-w-[100px] sm:min-w-[120px]"
                                  >
                                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="hidden sm:inline">Open App</span>
                                    <span className="sm:hidden">App</span>
                                    <ExternalLink className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
                                  </a>
                                </Button>
                              </TableCell>
                              {currentUser?.userType !== "user" && (
                                <TableCell className="px-2 sm:px-4 py-3 sm:py-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700 font-medium shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 w-full sm:w-auto"
                                  >
                                    <a
                                      href={system.sheetLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center space-x-1 sm:space-x-2 min-w-[100px] sm:min-w-[120px]"
                                    >
                                      <Sheet className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                      <span className="hidden sm:inline">View Sheet</span>
                                      <span className="sm:hidden">Sheet</span>
                                      <ExternalLink className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
                                    </a>
                                  </Button>
                                </TableCell>
                              )}
                              {isRunning && (
                                <TableCell className="px-2 sm:px-4 py-3 sm:py-4">
                                  <div className="max-w-[300px] sm:max-w-[350px] bg-white/50 rounded-lg p-2 sm:p-3 border border-white/30">
                                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium break-words">
                                      {system.remarks}
                                    </p>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <>
      {!isInitialized ? (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : (
        <>
          {currentView === "login" && renderLoginPage()}
          {currentView === "main" && renderMainDashboard()}
          {currentView === "complete" && renderSystemTable("complete")}
          {currentView === "running" && renderSystemTable("running")}
        </>
      )}
    </>
  )
}
