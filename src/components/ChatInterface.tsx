'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Zap } from 'lucide-react'
import { CopilotKit } from '@copilotkit/react-core'
import { useCopilotChat, useCopilotAction } from '@copilotkit/react-core'
import { TextMessage, Role } from "@copilotkit/runtime-client-gql"
import { Mention, MentionsInput } from 'react-mentions'

function ChatInterfaceInner() {
  const {
    visibleMessages,
    appendMessage,
    isLoading,
  } = useCopilotChat()

  const [customers, setCustomers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  
  // Fetch users and customers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true)
        const [usersRes, customersRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/customers')
        ])
        
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          // Users API returns { users: [...], total: ... }
          setUsers(usersData.users || [])
        }
        
        if (customersRes.ok) {
          const customersData = await customersRes.json()
          // Customers API returns array directly
          setCustomers(Array.isArray(customersData) ? customersData : [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // Set empty arrays on error
        setUsers([])
        setCustomers([])
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages])

  // Parse mentions to IDs for sending
  const parseMentionsToIds = (text: string): string => {
    if (!text || typeof text !== 'string') {
      return ''
    }
    
    let parsedText = text
    
    try {
      // Parse @[User Name](user:id) to @user:id
      parsedText = parsedText.replace(/@\[([^\]]+)\]\(user:([^)]+)\)/g, '@user:$2')
      
      // Parse #[Company Name](customer:id) to #customer:id
      parsedText = parsedText.replace(/#\[([^\]]+)\]\(customer:([^)]+)\)/g, '#customer:$2')
      
      return parsedText
    } catch (error) {
      console.error('Error in parseMentionsToIds:', error)
      return text
    }
  }

  // Parse IDs back to names for display with HTML styling
  const parseIdsToNames = (text: string, isUserMessage: boolean = false): string => {
    if (!text || typeof text !== 'string') {
      return ''
    }
    
    let parsedText = text
    
    try {
      // Parse @user:id back to styled @User Name
      const userIdMatches = text.match(/@user:([a-zA-Z0-9-]+)/g)
      if (userIdMatches && Array.isArray(users)) {
        userIdMatches.forEach(match => {
          const userId = match.replace('@user:', '')
          const user = users.find(u => u.id === userId)
          if (user) {
            const styledMention = isUserMessage 
              ? `<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white bg-opacity-20 text-white rounded-full border border-white border-opacity-30">@${user.name || user.email}</span>`
              : `<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200">@${user.name || user.email}</span>`
            parsedText = parsedText.replace(match, styledMention)
          }
        })
      }
      
      // Parse #customer:id back to styled #Company Name
      const customerIdMatches = text.match(/#customer:([a-zA-Z0-9-]+)/g)
      if (customerIdMatches && Array.isArray(customers)) {
        customerIdMatches.forEach(match => {
          const customerId = match.replace('#customer:', '')
          const customer = customers.find(c => c.id === customerId)
          if (customer) {
            const styledMention = isUserMessage
              ? `<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-white bg-opacity-20 text-white rounded-full border border-white border-opacity-30">#${customer.name}</span>`
              : `<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full border border-green-200">#${customer.name}</span>`
            parsedText = parsedText.replace(match, styledMention)
          }
        })
      }
      
      return parsedText
    } catch (error) {
      console.error('Error in parseIdsToNames:', error)
      return text
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input || !input.trim() || isLoading) {
      return
    }
    
    try {
      const messageWithIds = parseMentionsToIds(input.trim())
      appendMessage(new TextMessage({ content: messageWithIds, role: Role.User }))
      setInput('')
    } catch (error) {
      console.error('Error in handleSubmit:', error)
    }
  }

  // Mention styles
  const mentionStyle = {
    control: {
      backgroundColor: '#ffffff',
      fontSize: '14px',
      fontWeight: 'normal',
      fontFamily: 'inherit',
    },
    '&multiLine': {
      control: {
        fontFamily: 'inherit',
        minHeight: '44px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '12px',
        backgroundColor: '#ffffff',
        fontSize: '14px',
        lineHeight: '1.5',
        transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
      },
      highlighter: {
        padding: '12px',
        border: '1px solid transparent',
        borderRadius: '8px',
        fontSize: '14px',
        lineHeight: '1.5',
      },
      input: {
        padding: '12px',
        border: '1px solid transparent',
        borderRadius: '8px',
        outline: 'none',
        resize: 'none' as const,
        fontSize: '14px',
        lineHeight: '1.5',
        fontFamily: 'inherit',
        backgroundColor: 'transparent',
      },
    },
    '&singleLine': {
      control: {
        fontFamily: 'inherit',
        display: 'inline-block',
        width: '100%',
      },
      highlighter: {
        padding: '1px',
        border: '2px inset transparent',
      },
      input: {
        padding: '1px',
        border: '2px inset',
      },
    },
    suggestions: {
      list: {
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        fontSize: '14px',
        maxHeight: '200px',
        overflow: 'auto',
        zIndex: 1000,
        padding: '4px',
      },
      item: {
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease-in-out',
        border: 'none',
        '&focused': {
          backgroundColor: 'transparent',
          outline: 'none',
        },
        '&:hover': {
          backgroundColor: 'transparent',
        },
        '&:last-child': {
          borderBottom: 'none',
        },
      },
    },
  }

  const userMentionStyle = {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500',
    fontSize: '14px',
    border: '1px solid #bfdbfe',
    display: 'inline-block',
    margin: '0 1px',
  }

  const customerMentionStyle = {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500',
    fontSize: '14px',
    border: '1px solid #bbf7d0',
    display: 'inline-block',
    margin: '0 1px',
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Asistan</h3>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            CopilotKit
          </span>
          {dataLoading && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Yükleniyor...
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleMessages.map((message: any) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                {message.role === 'user' && (
                  <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div 
                    className="text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: parseIdsToNames(message.content, message.role === 'user') }}
                  />
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.createdAt || Date.now()).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input with Mentions */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1">
            <MentionsInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mesajınızı yazın... (@kullanıcı veya #müşteri mention edebilirsiniz)"
              style={mentionStyle}
              disabled={isLoading || dataLoading}
            >
              <Mention
                trigger="@"
                data={Array.isArray(users) ? users.map(u => ({ 
                  id: u.id, 
                  display: u.name || u.email,
                  email: u.email,
                  role: u.role
                })) : []}
                markup="@[__display__](user:__id__)"
                style={userMentionStyle}
                displayTransform={(id, display) => `@${display}`}
                renderSuggestion={(suggestion: any, search, highlightedDisplay, index, focused) => (
                  <div className={`flex items-center space-x-3 ${focused ? 'bg-blue-50' : ''}`}>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {(suggestion.display || '').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {highlightedDisplay}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {suggestion.email || ''}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 uppercase">
                      {suggestion.role || ''}
                    </div>
                  </div>
                )}
              />
              <Mention
                trigger="#"
                data={Array.isArray(customers) ? customers.map(c => ({ 
                  id: c.id, 
                  display: c.name,
                  description: c.description
                })) : []}
                markup="#[__display__](customer:__id__)"
                style={customerMentionStyle}
                displayTransform={(id, display) => `#${display}`}
                renderSuggestion={(suggestion: any, search, highlightedDisplay, index, focused) => (
                  <div className={`flex items-center space-x-3 ${focused ? 'bg-green-50' : ''}`}>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-medium text-sm">
                        {(suggestion.display || '').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {highlightedDisplay}
                      </div>
                      {suggestion.description && (
                        <div className="text-sm text-gray-500 truncate">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      MÜŞTERİ
                    </div>
                  </div>
                )}
              />
            </MentionsInput>
          </div>  
          {/* Regular Send Button */}
          <button
            type="submit"
            disabled={isLoading || dataLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          <div>💡 @ yazarak kullanıcıları, # yazarak müşterileri mention edebilirsiniz</div>
          <div>⚡ Mor butona basarak mesajdan otomatik task oluşturabilirsiniz</div>
        </div>
      </div>
    </div>
  )
}

export default function ChatInterface() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <ChatInterfaceInner />
    </CopilotKit>
  )
}
