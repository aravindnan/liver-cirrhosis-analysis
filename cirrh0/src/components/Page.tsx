import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import Disclaimer from './Disclaimer'

type PageProps = { active?: string; title: string; intro?: string; children: React.ReactNode; disclaimer?: boolean }

// One frame for the tool pages: a title, one supporting sentence, then the content on the same two margins.
function Page({ active, title, intro, children, disclaimer = true }: PageProps) {
  return (
    <div className="flex flex-col justify-between min-h-screen">
      <Navbar activePage={active} />
      <main className="flex-1 pt-[100px] md:pt-[130px] mx-auto w-[92%] md:w-[80%] flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="league-spartan font-bold text-[34px] md:text-[56px] leading-[1.05] text-C11">{title}</h1>
          {intro && <p className="text-[17px] md:text-[19px] max-w-[62ch]">{intro}</p>}
        </div>
        {children}
        {disclaimer && <Disclaimer />}
      </main>
      <Footer />
    </div>
  )
}

export default Page
