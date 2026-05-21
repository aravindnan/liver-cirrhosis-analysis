import React from 'react'

function LogoText(props:any) {
  const{look}=props
  return (
    <div className={`${look} league-spartan font-bold`}>
      Cirrh<span className='outlineText'>0</span>
    </div>
  )
}

export default LogoText
