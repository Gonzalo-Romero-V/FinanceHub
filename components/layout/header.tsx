import Link from "next/link"
import { Button } from "@/components/ui/button"
import {Logo} from "@/components/layout/logo";


import { MobileAside } from "@/components/layout/mobile-aside";



export function Header() {
  return (

    <header className="w-full border-b bg-background">
      <div className="container mx-auto max-w-4xl flex h-16 items-center justify-between px-4">


        {/* Logo */}
        <div className="flex items-center">
          <Link href="/">
            <Logo size="h3" className="tracking-tight hover:text-[1.3rem] transition-all duration-300" />
          </Link>
        </div>

        <MobileAside />
        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <Button className="hover:text-brand-1 hover:no-underline hover:-translate-y-1 transition-all duration-300" variant="link" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button className="hover:text-brand-1 hover:no-underline hover:-translate-y-1 transition-all duration-300"  variant="link" asChild>
            <Link href="/tutorial">Tutorial</Link>
          </Button>
          <Button className="hover:text-brand-1 hover:no-underline hover:-translate-y-1 transition-all duration-300" variant="link" asChild>
            <Link href="/about">About Us</Link>
          </Button>
          <Button className="hover:text-brand-1 hover:no-underline hover:-translate-y-1 transition-all duration-300" variant="link" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </nav>


      </div>
    </header>
  )
}
